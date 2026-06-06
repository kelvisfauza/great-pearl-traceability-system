CREATE OR REPLACE FUNCTION public.overdraft_activate(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_name text;
  v_limit numeric;
  v_account_id uuid;
  v_existing_status text;
  v_period text := to_char(now(), 'YYYY-MM');
BEGIN
  SELECT public.get_unified_user_id(p_email) INTO v_uid;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User not found');
  END IF;

  SELECT name INTO v_name FROM public.employees WHERE email = p_email LIMIT 1;

  -- Any existing row for this user?
  SELECT id, status INTO v_account_id, v_existing_status
    FROM public.overdraft_accounts WHERE user_id = v_uid LIMIT 1;

  IF v_account_id IS NOT NULL AND v_existing_status = 'active' THEN
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

  IF v_account_id IS NOT NULL THEN
    -- Reactivate existing (previously closed/suspended) account
    UPDATE public.overdraft_accounts
       SET status = 'active',
           approved_limit = v_limit,
           outstanding_balance = COALESCE(outstanding_balance, 0),
           frozen = false,
           first_negative_at = NULL,
           approved_by = 'system:self-activated',
           approved_at = now(),
           auto_managed = true,
           employee_name = COALESCE(v_name, employee_name, p_email),
           updated_at = now()
     WHERE id = v_account_id;
  ELSE
    INSERT INTO public.overdraft_accounts
      (user_id, employee_email, employee_name, approved_limit, outstanding_balance,
       activation_fee, activation_fee_paid, status, approved_by, approved_at, auto_managed)
    VALUES
      (v_uid, p_email, COALESCE(v_name, p_email), v_limit, 0,
       0, true, 'active', 'system:self-activated', now(), true)
    RETURNING id INTO v_account_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'account_id', v_account_id, 'limit', v_limit);
END;
$function$;