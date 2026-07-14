CREATE OR REPLACE FUNCTION public.can_insert_salary_advance_ledger_entry(
  _user_id text,
  _entry_type text,
  _amount numeric,
  _source_category text,
  _metadata jsonb
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_email text;
  v_wallet_user_id text;
  v_advance_id text;
  v_remaining numeric;
  v_kind text;
BEGIN
  IF v_caller IS NULL THEN
    RETURN false;
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = v_caller;

  IF v_email IS NULL THEN
    RETURN false;
  END IF;

  v_wallet_user_id := COALESCE(public.get_unified_user_id(v_email), v_caller::text);
  IF _user_id IS DISTINCT FROM v_wallet_user_id AND _user_id IS DISTINCT FROM v_caller::text THEN
    RETURN false;
  END IF;

  IF COALESCE(_amount, 0) >= 0 THEN
    RETURN false;
  END IF;

  IF upper(COALESCE(_entry_type, '')) NOT IN ('WITHDRAWAL', 'ADJUSTMENT') THEN
    RETURN false;
  END IF;

  v_advance_id := COALESCE(
    NULLIF(_metadata->>'advance_id', ''),
    NULLIF(_metadata->>'salary_advance_id', ''),
    NULLIF(_metadata->>'p_advance_id', '')
  );

  IF v_advance_id IS NULL OR v_advance_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;

  v_kind := lower(concat_ws(' ',
    COALESCE(_source_category, ''),
    COALESCE(_metadata->>'type', ''),
    COALESCE(_metadata->>'source', ''),
    COALESCE(_metadata->>'description', '')
  ));

  -- Must clearly be a salary advance repayment or its overdraft/access-fee debit.
  IF v_kind NOT LIKE '%salary%advance%'
     AND v_kind NOT LIKE '%advance%repay%'
     AND v_kind NOT LIKE '%overdraft%'
     AND v_kind NOT LIKE '%od%fee%' THEN
    RETURN false;
  END IF;

  SELECT esa.remaining_balance INTO v_remaining
  FROM public.employee_salary_advances esa
  WHERE esa.id = v_advance_id::uuid
    AND lower(esa.employee_email) = lower(v_email)
    AND esa.status IN ('active', 'approved', 'pending')
  LIMIT 1;

  IF v_remaining IS NULL THEN
    RETURN false;
  END IF;

  IF v_kind LIKE '%overdraft%' OR v_kind LIKE '%od%fee%' THEN
    RETURN abs(_amount) <= GREATEST(1000, ceil(v_remaining * 0.005));
  END IF;

  RETURN abs(_amount) <= v_remaining;
END;
$$;

REVOKE ALL ON FUNCTION public.can_insert_salary_advance_ledger_entry(text, text, numeric, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_insert_salary_advance_ledger_entry(text, text, numeric, text, jsonb) TO authenticated;