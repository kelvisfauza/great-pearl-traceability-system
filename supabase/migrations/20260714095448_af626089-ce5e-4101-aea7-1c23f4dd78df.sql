CREATE OR REPLACE FUNCTION public.update_advance_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_trusted text;
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status <> 'approved') THEN
    -- If the trusted wallet repayment RPC already updated the advance balance,
    -- do not apply the same payment a second time through this history trigger.
    BEGIN
      v_trusted := current_setting('app.trusted_advance_repay', true);
    EXCEPTION WHEN OTHERS THEN
      v_trusted := NULL;
    END;

    IF v_trusted IS NOT NULL AND v_trusted = NEW.advance_id::text THEN
      RETURN NEW;
    END IF;

    UPDATE public.employee_salary_advances
       SET remaining_balance = GREATEST(0, COALESCE(remaining_balance, 0) - COALESCE(NEW.amount_paid, 0)),
           updated_at = now(),
           status = CASE
             WHEN GREATEST(0, COALESCE(remaining_balance, 0) - COALESCE(NEW.amount_paid, 0)) <= 0 THEN 'cleared'
             ELSE 'active'
           END
     WHERE id = NEW.advance_id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.repay_salary_advance_from_wallet(p_advance_id uuid, p_amount numeric, p_use_overdraft boolean DEFAULT false)
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

  -- Keep this trusted flag active through both the advance update and payment-log insert.
  -- The payment-log trigger must not deduct the same repayment a second time.
  PERFORM set_config('app.trusted_advance_repay', p_advance_id::text, true);

  UPDATE public.employee_salary_advances
     SET remaining_balance = v_new_remaining,
         status = CASE WHEN v_is_cleared THEN 'cleared' ELSE 'active' END,
         updated_at = now()
   WHERE id = p_advance_id;

  INSERT INTO public.salary_advance_payments (advance_id, employee_email, amount_paid, status, approved_by)
  VALUES (p_advance_id, v_adv.employee_email, p_amount, 'approved', v_caller_email);

  PERFORM set_config('app.trusted_advance_repay', '', true);

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

GRANT EXECUTE ON FUNCTION public.repay_salary_advance_from_wallet(uuid, numeric, boolean) TO authenticated;