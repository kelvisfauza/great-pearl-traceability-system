
CREATE OR REPLACE FUNCTION public.overdraft_daily_maintenance()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_interest numeric;
  v_new_out numeric;
  v_ledger_id uuid;
  v_accrued int := 0;
  v_penalties int := 0;
  v_rate_bps int;
  v_days int;
  v_is_penalty boolean;
  v_ref text;
  v_desc text;
  v_wallet_balance numeric;
  v_charge_base numeric;
  v_first_neg timestamptz;
BEGIN
  -- Self-heal: for every active OD account whose wallet is currently negative but
  -- first_negative_at is NULL, backfill first_negative_at from the ledger crossover.
  FOR r IN
    SELECT oa.id, oa.user_id
      FROM public.overdraft_accounts oa
     WHERE oa.status = 'active'
       AND oa.first_negative_at IS NULL
       AND COALESCE((SELECT SUM(le.amount) FROM public.ledger_entries le WHERE le.user_id::text = oa.user_id::text), 0) < 0
  LOOP
    WITH running AS (
      SELECT le.created_at, le.id,
             SUM(le.amount) OVER (ORDER BY le.created_at, le.id) AS bal
      FROM public.ledger_entries le
      WHERE le.user_id::text = r.user_id::text
    )
    SELECT MIN(created_at) INTO v_first_neg
      FROM running
     WHERE bal < 0
       AND created_at > COALESCE((SELECT MAX(created_at) FROM running WHERE bal >= 0), '1900-01-01'::timestamptz);

    IF v_first_neg IS NOT NULL THEN
      UPDATE public.overdraft_accounts
         SET first_negative_at = v_first_neg,
             interest_rate_bps = GREATEST(COALESCE(interest_rate_bps, 60), 60),
             updated_at = now()
       WHERE id = r.id;
    END IF;
  END LOOP;

  -- Self-heal: clear first_negative_at when wallet is back to zero/positive so the
  -- next negative window starts a fresh 5-day clock.
  UPDATE public.overdraft_accounts oa
     SET first_negative_at = NULL,
         outstanding_balance = 0,
         updated_at = now()
   WHERE oa.status = 'active'
     AND oa.first_negative_at IS NOT NULL
     AND COALESCE((SELECT SUM(le.amount) FROM public.ledger_entries le WHERE le.user_id::text = oa.user_id::text), 0) >= 0;

  FOR r IN
    SELECT * FROM public.overdraft_accounts
     WHERE status = 'active'
       AND (
         outstanding_balance > 0
         OR COALESCE((SELECT SUM(le.amount) FROM public.ledger_entries le WHERE le.user_id::text = overdraft_accounts.user_id::text), 0) < 0
       )
  LOOP
    SELECT COALESCE(SUM(le.amount), 0)
      INTO v_wallet_balance
    FROM public.ledger_entries le
    WHERE le.user_id::text = r.user_id::text;

    v_charge_base := GREATEST(COALESCE(r.outstanding_balance, 0), GREATEST(0, -v_wallet_balance));

    IF v_charge_base <= 0 THEN
      CONTINUE;
    END IF;

    v_days := COALESCE(EXTRACT(DAY FROM (now() - r.first_negative_at))::int, 0);

    IF v_days >= 5 THEN
      v_rate_bps := 1000;
      v_is_penalty := true;
      v_ref := 'OD-PEN-' || r.id::text || '-' || to_char(now(),'YYYYMMDD');
      v_desc := 'Overdraft penalty (10%/day after 5 days outstanding)';
    ELSE
      v_rate_bps := COALESCE(r.interest_rate_bps, 60);
      v_is_penalty := false;
      v_ref := 'OD-INT-' || r.id::text || '-' || to_char(now(),'YYYYMMDD');
      v_desc := 'Daily overdraft charge (' || (v_rate_bps::numeric/100)::text || '%/day)';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.ledger_entries le
      WHERE le.user_id::text = r.user_id::text
        AND le.reference = v_ref
    ) THEN
      CONTINUE;
    END IF;

    v_interest := round(v_charge_base * (v_rate_bps::numeric / 10000), 0);
    IF v_interest > 0 THEN
      INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, source_category)
      VALUES (
        r.user_id::text, 'WITHDRAWAL', -v_interest, v_ref,
        jsonb_build_object('type', CASE WHEN v_is_penalty THEN 'overdraft_penalty' ELSE 'overdraft_interest' END,
                           'overdraft_account_id', r.id,
                           'rate_bps', v_rate_bps,
                           'days_outstanding', v_days,
                           'is_penalty', v_is_penalty,
                           'charge_base', v_charge_base,
                           'wallet_balance_before_charge', v_wallet_balance,
                           'account_outstanding_before_charge', COALESCE(r.outstanding_balance, 0),
                           'description', v_desc),
        CASE WHEN v_is_penalty THEN 'OVERDRAFT_PENALTY' ELSE 'OVERDRAFT_INTEREST' END
      ) RETURNING id INTO v_ledger_id;

      v_new_out := GREATEST(COALESCE(r.outstanding_balance, 0), GREATEST(0, -v_wallet_balance)) + v_interest;
      UPDATE public.overdraft_accounts
         SET outstanding_balance = v_new_out,
             total_interest = COALESCE(total_interest,0) + v_interest,
             last_interest_at = now(),
             updated_at = now()
       WHERE id = r.id;

      INSERT INTO public.overdraft_transactions
        (account_id, user_id, transaction_type, amount, balance_after, ledger_entry_id, reference, metadata)
      VALUES
        (r.id, r.user_id, CASE WHEN v_is_penalty THEN 'penalty' ELSE 'interest' END,
         v_interest, v_new_out, v_ledger_id,
         CASE WHEN v_is_penalty THEN 'DAILY-PEN' ELSE 'DAILY-INT' END,
         jsonb_build_object('rate_bps', v_rate_bps,
                            'days_outstanding', v_days,
                            'is_penalty', v_is_penalty,
                            'charge_base', v_charge_base,
                            'wallet_balance_before_charge', v_wallet_balance));

      IF v_is_penalty THEN v_penalties := v_penalties + 1; ELSE v_accrued := v_accrued + 1; END IF;
    END IF;
  END LOOP;

  UPDATE public.overdraft_accounts
     SET frozen = true, updated_at = now()
   WHERE status = 'active'
     AND outstanding_balance > 0
     AND frozen = false
     AND first_negative_at < now() - interval '30 days';

  RETURN jsonb_build_object('ok', true, 'accrued', v_accrued, 'penalties', v_penalties);
END;
$function$;
