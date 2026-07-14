
-- Fix repay_salary_advance_from_wallet + trigger interaction.
-- The trigger occasionally blocks legitimate overdraft-funded repayments;
-- allow the update when it comes from our trusted SECURITY DEFINER RPC by
-- setting a session-local flag.

CREATE OR REPLACE FUNCTION public.repay_salary_advance_from_wallet(
  p_advance_id uuid, p_amount numeric, p_use_overdraft boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_email text;
  v_adv record;
  v_user_id text;
  v_wallet_bal numeric;
  v_od_portion numeric := 0;
  v_od_fee numeric := 0;
  v_ref text;
  v_new_remaining numeric;
  v_is_cleared boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_amount IS NULL OR p_amount < 500 THEN
    RAISE EXCEPTION 'Minimum amount is UGX 500';
  END IF;

  SELECT email INTO v_caller_email FROM auth.users WHERE id = v_caller;

  SELECT * INTO v_adv FROM public.employee_salary_advances WHERE id = p_advance_id;
  IF v_adv IS NULL THEN RAISE EXCEPTION 'Advance not found'; END IF;
  IF lower(v_adv.employee_email) <> lower(v_caller_email) THEN
    RAISE EXCEPTION 'Not authorised for this advance';
  END IF;
  IF p_amount > COALESCE(v_adv.remaining_balance, 0) THEN
    RAISE EXCEPTION 'Amount exceeds outstanding balance';
  END IF;

  v_user_id := COALESCE(public.get_unified_user_id(v_adv.employee_email), v_caller::text);

  SELECT COALESCE(SUM(amount), 0) INTO v_wallet_bal
    FROM public.ledger_entries WHERE user_id::text = v_user_id;

  v_od_portion := GREATEST(0, p_amount - GREATEST(0, v_wallet_bal));
  IF v_od_portion > 0 AND NOT p_use_overdraft THEN
    RAISE EXCEPTION 'Overdraft required but not authorised';
  END IF;
  IF v_od_portion > 0 THEN
    v_od_fee := ceil(v_od_portion * 0.005);
  END IF;

  v_ref := 'ADVREPAY-WALLET-' || substring(p_advance_id::text, 1, 8) || '-' || extract(epoch from now())::bigint::text;

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
  VALUES (
    v_user_id, 'WITHDRAWAL', -p_amount, v_ref, 'SALARY_ADVANCE_REPAYMENT',
    jsonb_build_object(
      'advance_id', p_advance_id,
      'source', 'wallet_advance_repayment',
      'type', 'internal_transfer_credit',
      'bypass_treasury_check', true,
      'description', 'Salary advance repayment from wallet – UGX ' || p_amount::text ||
        CASE WHEN v_od_portion > 0 THEN ' (incl. OD top-up UGX ' || v_od_portion::text || ')' ELSE '' END,
      'overdraft_portion', CASE WHEN v_od_portion > 0 THEN v_od_portion ELSE NULL END,
      'uses_overdraft', v_od_portion > 0
    )
  );

  IF v_od_fee > 0 THEN
    INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
    VALUES (
      v_user_id, 'WITHDRAWAL', -v_od_fee, v_ref || '-ODFEE', 'OVERDRAFT_INTEREST',
      jsonb_build_object(
        'advance_id', p_advance_id,
        'type', 'overdraft_draw',
        'parent_reference', v_ref,
        'overdraft_portion', v_od_portion,
        'bypass_treasury_check', true,
        'description', 'Overdraft access fee 0.5% on UGX ' || v_od_portion::text
      )
    );
  END IF;

  v_new_remaining := GREATEST(0, COALESCE(v_adv.remaining_balance, 0) - p_amount);
  v_is_cleared := v_new_remaining <= 0;

  -- Signal the guard trigger that this update is coming from our trusted RPC.
  PERFORM set_config('app.trusted_advance_repay', p_advance_id::text, true);

  UPDATE public.employee_salary_advances
     SET remaining_balance = v_new_remaining,
         status = CASE WHEN v_is_cleared THEN 'cleared' ELSE 'active' END,
         updated_at = now()
   WHERE id = p_advance_id;

  PERFORM set_config('app.trusted_advance_repay', '', true);

  INSERT INTO public.salary_advance_payments (advance_id, employee_email, amount_paid, status, approved_by)
  VALUES (p_advance_id, v_adv.employee_email, p_amount, 'approved', v_caller_email);

  RETURN jsonb_build_object(
    'ok', true,
    'reference', v_ref,
    'amount', p_amount,
    'overdraft_portion', v_od_portion,
    'overdraft_fee', v_od_fee,
    'new_remaining', v_new_remaining,
    'cleared', v_is_cleared
  );
END;
$function$;

-- Update the trigger to trust the RPC-signalled flag.
CREATE OR REPLACE FUNCTION public.validate_salary_advance_self_repayment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_wallet_user_id text;
  v_reduction numeric;
  v_recent_repayment numeric;
  v_expected_status text;
  v_trusted text;
BEGIN
  -- Let database jobs / service-role / admin / finance continue.
  IF auth.uid() IS NULL OR public.user_has_permission('Finance') OR public.is_current_user_admin() THEN
    RETURN NEW;
  END IF;

  -- Trust updates coming from our SECURITY DEFINER repay RPC.
  BEGIN
    v_trusted := current_setting('app.trusted_advance_repay', true);
  EXCEPTION WHEN OTHERS THEN
    v_trusted := NULL;
  END;
  IF v_trusted IS NOT NULL AND v_trusted = NEW.id::text THEN
    RETURN NEW;
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = auth.uid();

  IF v_email IS NULL
     OR lower(OLD.employee_email) <> lower(v_email)
     OR lower(NEW.employee_email) <> lower(OLD.employee_email) THEN
    RAISE EXCEPTION 'Not authorised to update this salary advance';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.employee_name IS DISTINCT FROM OLD.employee_name
     OR NEW.original_amount IS DISTINCT FROM OLD.original_amount
     OR NEW.minimum_payment IS DISTINCT FROM OLD.minimum_payment
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only repayment fields can be updated by the employee';
  END IF;

  IF COALESCE(NEW.remaining_balance, 0) < 0
     OR COALESCE(NEW.remaining_balance, 0) > COALESCE(OLD.remaining_balance, 0) THEN
    RAISE EXCEPTION 'Invalid salary advance balance update (old=% new=%)',
      OLD.remaining_balance, NEW.remaining_balance;
  END IF;

  v_reduction := COALESCE(OLD.remaining_balance, 0) - COALESCE(NEW.remaining_balance, 0);
  IF v_reduction <= 0 THEN
    RETURN NEW;
  END IF;

  v_wallet_user_id := COALESCE(public.get_unified_user_id(v_email), auth.uid()::text);

  SELECT COALESCE(SUM(abs(le.amount)), 0) INTO v_recent_repayment
  FROM public.ledger_entries le
  WHERE le.user_id = v_wallet_user_id
    AND le.amount < 0
    AND le.source_category = 'SALARY_ADVANCE_REPAYMENT'
    AND le.metadata->>'advance_id' = OLD.id::text
    AND le.created_at >= now() - interval '10 minutes';

  IF v_recent_repayment < v_reduction THEN
    RAISE EXCEPTION 'A matching wallet repayment is required before updating this advance';
  END IF;

  v_expected_status := CASE WHEN COALESCE(NEW.remaining_balance, 0) = 0 THEN 'cleared' ELSE 'active' END;
  IF NEW.status IS DISTINCT FROM v_expected_status THEN
    RAISE EXCEPTION 'Invalid salary advance status for remaining balance';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
