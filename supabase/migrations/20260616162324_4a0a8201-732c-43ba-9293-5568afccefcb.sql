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
  v_rate_bps int;
  v_days int;
BEGIN
  FOR r IN
    SELECT * FROM public.overdraft_accounts
     WHERE status = 'active' AND outstanding_balance > 0
  LOOP
    v_days := COALESCE(EXTRACT(DAY FROM (now() - r.first_negative_at))::int, 0);
    -- Flat daily rate (no penalty escalation) — matches MTN MoMoAdvance
    v_rate_bps := r.interest_rate_bps; -- standard (e.g. 50 = 0.5%/day)

    v_interest := round(r.outstanding_balance * (v_rate_bps::numeric / 10000), 0);
    IF v_interest > 0 THEN
      INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, source_category)
      VALUES (
        r.user_id::text, 'WITHDRAWAL', -v_interest,
        'OD-INT-' || r.id::text || '-' || to_char(now(),'YYYYMMDD'),
        jsonb_build_object('type', 'overdraft_interest',
                           'overdraft_account_id', r.id,
                           'rate_bps', v_rate_bps,
                           'days_outstanding', v_days,
                           'description', 'Daily overdraft charge (0.5%/day)'),
        'OVERDRAFT_INTEREST'
      ) RETURNING id INTO v_ledger_id;

      v_new_out := r.outstanding_balance + v_interest;
      UPDATE public.overdraft_accounts
         SET outstanding_balance = v_new_out,
             total_interest = total_interest + v_interest,
             last_interest_at = now(),
             updated_at = now()
       WHERE id = r.id;

      INSERT INTO public.overdraft_transactions
        (account_id, user_id, transaction_type, amount, balance_after, ledger_entry_id, reference, metadata)
      VALUES
        (r.id, r.user_id, 'interest', v_interest, v_new_out, v_ledger_id,
         'DAILY-INT',
         jsonb_build_object('rate_bps', v_rate_bps, 'days_outstanding', v_days));
      v_accrued := v_accrued + 1;
    END IF;
  END LOOP;

  -- Freeze accounts that have been negative for 30+ days
  UPDATE public.overdraft_accounts
     SET frozen = true, updated_at = now()
   WHERE status = 'active'
     AND outstanding_balance > 0
     AND frozen = false
     AND first_negative_at < now() - interval '30 days';

  RETURN jsonb_build_object('ok', true, 'accrued', v_accrued);
END;
$function$;