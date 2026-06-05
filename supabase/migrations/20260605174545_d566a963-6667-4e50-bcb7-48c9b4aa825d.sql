
-- ============= Schema additions =============
ALTER TABLE public.overdraft_accounts
  ADD COLUMN IF NOT EXISTS frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_negative_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_interest_at timestamptz,
  ADD COLUMN IF NOT EXISTS interest_rate_bps integer NOT NULL DEFAULT 50, -- 0.5% per day
  ADD COLUMN IF NOT EXISTS total_interest numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_managed boolean NOT NULL DEFAULT true;

-- ============= Replace get_overdraft_account =============
DROP FUNCTION IF EXISTS public.get_overdraft_account(text);
CREATE OR REPLACE FUNCTION public.get_overdraft_account(user_email text)
RETURNS TABLE (
  id uuid, user_id uuid, approved_limit numeric, outstanding_balance numeric,
  available_overdraft numeric, status text, frozen boolean,
  first_negative_at timestamptz, days_negative integer,
  total_interest numeric, interest_rate_bps integer,
  approved_at timestamptz, last_used_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT oa.id, oa.user_id, oa.approved_limit, oa.outstanding_balance,
         GREATEST(0, oa.approved_limit - oa.outstanding_balance) AS available_overdraft,
         oa.status, oa.frozen, oa.first_negative_at,
         CASE WHEN oa.first_negative_at IS NULL THEN 0
              ELSE GREATEST(0, EXTRACT(day FROM now() - oa.first_negative_at)::int) END AS days_negative,
         oa.total_interest, oa.interest_rate_bps,
         oa.approved_at, oa.last_used_at
  FROM public.overdraft_accounts oa
  WHERE oa.employee_email = user_email AND oa.status = 'active'
  LIMIT 1;
$$;

-- ============= Trigger: track first_negative_at + unfreeze on clearance =============
CREATE OR REPLACE FUNCTION public.overdraft_outstanding_state()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.outstanding_balance > 0 AND (OLD.outstanding_balance IS NULL OR OLD.outstanding_balance = 0) THEN
    NEW.first_negative_at := now();
  END IF;
  IF NEW.outstanding_balance <= 0 THEN
    NEW.outstanding_balance := 0;
    NEW.first_negative_at := NULL;
    NEW.frozen := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_overdraft_outstanding_state ON public.overdraft_accounts;
CREATE TRIGGER trg_overdraft_outstanding_state
BEFORE UPDATE OF outstanding_balance ON public.overdraft_accounts
FOR EACH ROW EXECUTE FUNCTION public.overdraft_outstanding_state();

-- ============= overdraft_activate =============
CREATE OR REPLACE FUNCTION public.overdraft_activate(p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_name text;
  v_limit numeric;
  v_account_id uuid;
  v_period text := to_char(now(), 'YYYY-MM');
BEGIN
  SELECT public.get_unified_user_id(p_email) INTO v_uid;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User not found');
  END IF;

  SELECT name INTO v_name FROM public.employees WHERE email = p_email LIMIT 1;

  -- Already active?
  SELECT id INTO v_account_id FROM public.overdraft_accounts
   WHERE user_id = v_uid AND status = 'active' LIMIT 1;
  IF v_account_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'account_id', v_account_id, 'already_active', true);
  END IF;

  -- Look up current month's eligibility limit
  SELECT computed_limit INTO v_limit FROM public.overdraft_eligibility
   WHERE employee_email = p_email AND period = v_period
   ORDER BY computed_at DESC LIMIT 1;

  IF v_limit IS NULL OR v_limit <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error',
      'No eligibility limit for this month — your wallet activity does not yet qualify.');
  END IF;

  INSERT INTO public.overdraft_accounts
    (user_id, employee_email, employee_name, approved_limit, outstanding_balance,
     activation_fee, activation_fee_paid, status, approved_by, approved_at, auto_managed)
  VALUES
    (v_uid, p_email, COALESCE(v_name, p_email), v_limit, 0,
     0, true, 'active', 'system:self-activated', now(), true)
  RETURNING id INTO v_account_id;

  RETURN jsonb_build_object('ok', true, 'account_id', v_account_id, 'limit', v_limit);
END;
$$;

-- ============= overdraft_deactivate =============
CREATE OR REPLACE FUNCTION public.overdraft_deactivate(p_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_account RECORD;
BEGIN
  SELECT * INTO v_account FROM public.overdraft_accounts
   WHERE employee_email = p_email AND status = 'active' LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No active account');
  END IF;
  IF v_account.outstanding_balance > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error',
      format('Clear your outstanding UGX %s first', v_account.outstanding_balance::text));
  END IF;
  UPDATE public.overdraft_accounts
     SET status = 'closed', closed_at = now()
   WHERE id = v_account.id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ============= get_overdraft_spendable =============
CREATE OR REPLACE FUNCTION public.get_overdraft_spendable(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet numeric;
  v_acc RECORD;
  v_available numeric := 0;
  v_frozen boolean := false;
BEGIN
  v_wallet := COALESCE(public.get_wallet_balance(p_user_id), 0);
  SELECT * INTO v_acc FROM public.overdraft_accounts
   WHERE user_id = p_user_id AND status = 'active' LIMIT 1;
  IF FOUND THEN
    v_frozen := v_acc.frozen;
    IF NOT v_acc.frozen THEN
      v_available := GREATEST(0, v_acc.approved_limit - v_acc.outstanding_balance);
    END IF;
  END IF;
  RETURN jsonb_build_object(
    'wallet', v_wallet,
    'overdraft_available', v_available,
    'overdraft_limit', COALESCE(v_acc.approved_limit, 0),
    'overdraft_outstanding', COALESCE(v_acc.outstanding_balance, 0),
    'spendable', GREATEST(v_wallet, 0) + v_available,
    'frozen', v_frozen,
    'has_overdraft', v_acc.id IS NOT NULL
  );
END;
$$;

-- ============= consume_spendable =============
-- Debits the wallet, falling back to overdraft if needed. Returns json.
CREATE OR REPLACE FUNCTION public.consume_spendable(
  p_user_id uuid,
  p_amount numeric,
  p_source text,
  p_reference text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet numeric;
  v_acc RECORD;
  v_available numeric := 0;
  v_wallet_part numeric := 0;
  v_od_part numeric := 0;
  v_ledger_id uuid;
  v_new_out numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Amount must be positive');
  END IF;

  v_wallet := COALESCE(public.get_wallet_balance(p_user_id), 0);
  SELECT * INTO v_acc FROM public.overdraft_accounts
   WHERE user_id = p_user_id AND status = 'active'
   FOR UPDATE LIMIT 1;
  IF FOUND AND NOT v_acc.frozen THEN
    v_available := GREATEST(0, v_acc.approved_limit - v_acc.outstanding_balance);
  END IF;

  IF p_amount > GREATEST(v_wallet, 0) + v_available THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient funds (wallet + overdraft)',
      'wallet', v_wallet, 'overdraft_available', v_available);
  END IF;

  v_wallet_part := LEAST(p_amount, GREATEST(v_wallet, 0));
  v_od_part := p_amount - v_wallet_part;

  -- Insert ledger debit for the full amount in one entry; the wallet just dips negative for the OD part.
  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, source_category)
  VALUES (
    p_user_id::text,
    'WITHDRAWAL',
    -p_amount,
    COALESCE(p_reference, p_source || '-' || gen_random_uuid()::text),
    COALESCE(p_metadata,'{}'::jsonb)
      || jsonb_build_object('source', p_source, 'overdraft_portion', v_od_part, 'wallet_portion', v_wallet_part),
    CASE WHEN v_od_part > 0 THEN 'OVERDRAFT_DRAW' ELSE p_source END
  ) RETURNING id INTO v_ledger_id;

  IF v_od_part > 0 AND v_acc.id IS NOT NULL THEN
    v_new_out := v_acc.outstanding_balance + v_od_part;
    UPDATE public.overdraft_accounts
       SET outstanding_balance = v_new_out,
           total_drawn = total_drawn + v_od_part,
           last_used_at = now(),
           updated_at = now()
     WHERE id = v_acc.id;

    INSERT INTO public.overdraft_transactions
      (account_id, user_id, transaction_type, amount, balance_after, ledger_entry_id, reference, metadata)
    VALUES
      (v_acc.id, p_user_id, 'draw', v_od_part, v_new_out, v_ledger_id, p_reference,
       jsonb_build_object('source', p_source, 'wallet_portion', v_wallet_part));
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'ledger_id', v_ledger_id,
    'wallet_portion', v_wallet_part,
    'overdraft_portion', v_od_part,
    'new_outstanding', COALESCE(v_new_out, v_acc.outstanding_balance, 0)
  );
END;
$$;

-- ============= Daily maintenance: interest accrual + freeze flips =============
CREATE OR REPLACE FUNCTION public.overdraft_daily_maintenance()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  v_interest numeric;
  v_new_out numeric;
  v_ledger_id uuid;
  v_accrued int := 0;
  v_frozen int := 0;
BEGIN
  FOR r IN
    SELECT * FROM public.overdraft_accounts
     WHERE status = 'active' AND outstanding_balance > 0
  LOOP
    v_interest := round(r.outstanding_balance * (r.interest_rate_bps::numeric / 10000), 0);
    IF v_interest > 0 THEN
      -- Negative ledger entry tagged as interest (auto-skipped by recovery trigger because amount < 0)
      INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, source_category)
      VALUES (
        r.user_id::text, 'WITHDRAWAL', -v_interest,
        'OD-INT-' || r.id::text || '-' || to_char(now(),'YYYYMMDD'),
        jsonb_build_object('type', 'overdraft_interest',
                           'overdraft_account_id', r.id,
                           'rate_bps', r.interest_rate_bps,
                           'description', 'Daily overdraft interest accrual'),
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
         'DAILY-INT', jsonb_build_object('rate_bps', r.interest_rate_bps));
      v_accrued := v_accrued + 1;
    END IF;
  END LOOP;

  -- Freeze accounts that have been negative for 30+ days
  UPDATE public.overdraft_accounts
     SET frozen = true, updated_at = now()
   WHERE status = 'active'
     AND outstanding_balance > 0
     AND frozen = false
     AND first_negative_at IS NOT NULL
     AND first_negative_at < now() - interval '30 days';
  GET DIAGNOSTICS v_frozen = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'interest_rows', v_accrued, 'new_frozen', v_frozen);
END;
$$;

-- ============= Mirror monthly recompute into active accounts =============
CREATE OR REPLACE FUNCTION public.overdraft_sync_active_limits()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_period text := to_char(now(), 'YYYY-MM');
  v_count int;
BEGIN
  UPDATE public.overdraft_accounts oa
     SET approved_limit = e.computed_limit, updated_at = now()
    FROM public.overdraft_eligibility e
   WHERE oa.status = 'active'
     AND oa.auto_managed = true
     AND e.employee_email = oa.employee_email
     AND e.period = v_period;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'updated', v_count);
END;
$$;

-- ============= Admin overrides =============
CREATE OR REPLACE FUNCTION public.admin_overdraft_set_limit(p_account_id uuid, p_limit numeric, p_admin_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.overdraft_accounts
     SET approved_limit = GREATEST(0, p_limit),
         auto_managed = false,
         approved_by = p_admin_email || ':manual',
         updated_at = now()
   WHERE id = p_account_id;
  RETURN jsonb_build_object('ok', FOUND);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_overdraft_unfreeze(p_account_id uuid, p_admin_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.overdraft_accounts
     SET frozen = false,
         first_negative_at = CASE WHEN outstanding_balance > 0 THEN now() ELSE NULL END,
         updated_at = now()
   WHERE id = p_account_id;
  RETURN jsonb_build_object('ok', FOUND);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_overdraft_close(p_account_id uuid, p_admin_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.overdraft_accounts
     SET status = 'closed', closed_at = now(), updated_at = now()
   WHERE id = p_account_id AND outstanding_balance = 0;
  RETURN jsonb_build_object('ok', FOUND);
END; $$;

-- Grants
GRANT EXECUTE ON FUNCTION public.overdraft_activate(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.overdraft_deactivate(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_overdraft_spendable(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_spendable(uuid, numeric, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.overdraft_daily_maintenance() TO service_role;
GRANT EXECUTE ON FUNCTION public.overdraft_sync_active_limits() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_overdraft_set_limit(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overdraft_unfreeze(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overdraft_close(uuid, text) TO authenticated;
