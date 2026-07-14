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

  IF COALESCE(_source_category, '') NOT IN ('SALARY_ADVANCE_REPAYMENT', 'OVERDRAFT_INTEREST') THEN
    RETURN false;
  END IF;

  v_advance_id := NULLIF(_metadata->>'advance_id', '');
  IF v_advance_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT esa.remaining_balance INTO v_remaining
  FROM public.employee_salary_advances esa
  WHERE esa.id::text = v_advance_id
    AND lower(esa.employee_email) = lower(v_email)
    AND esa.status IN ('active', 'approved', 'pending')
  LIMIT 1;

  IF v_remaining IS NULL THEN
    RETURN false;
  END IF;

  IF _source_category = 'SALARY_ADVANCE_REPAYMENT' THEN
    RETURN abs(_amount) <= v_remaining;
  END IF;

  -- Overdraft access fee is also a debit, but keep it tightly bounded.
  RETURN abs(_amount) <= GREATEST(1000, ceil(v_remaining * 0.005));
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_insert_salary_advance_ledger_entry(text, text, numeric, text, jsonb) TO authenticated;
GRANT INSERT ON public.ledger_entries TO authenticated;

DROP POLICY IF EXISTS "Employees can insert own salary advance repayment ledger debits" ON public.ledger_entries;
CREATE POLICY "Employees can insert own salary advance repayment ledger debits"
ON public.ledger_entries
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_insert_salary_advance_ledger_entry(user_id, entry_type, amount, source_category, metadata)
);

CREATE OR REPLACE FUNCTION public.validate_salary_advance_self_repayment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_wallet_user_id text;
  v_reduction numeric;
  v_recent_repayment numeric;
  v_expected_status text;
BEGIN
  -- Let database jobs/service-role calls and finance/admin flows continue normally.
  IF auth.uid() IS NULL OR public.user_has_permission('Finance') OR public.is_current_user_admin() THEN
    RETURN NEW;
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_email IS NULL OR lower(OLD.employee_email) <> lower(v_email) OR lower(NEW.employee_email) <> lower(OLD.employee_email) THEN
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

  IF COALESCE(NEW.remaining_balance, 0) < 0 OR COALESCE(NEW.remaining_balance, 0) > COALESCE(OLD.remaining_balance, 0) THEN
    RAISE EXCEPTION 'Invalid salary advance balance update';
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
$$;

DROP TRIGGER IF EXISTS trg_validate_salary_advance_self_repayment_update ON public.employee_salary_advances;
CREATE TRIGGER trg_validate_salary_advance_self_repayment_update
BEFORE UPDATE ON public.employee_salary_advances
FOR EACH ROW
EXECUTE FUNCTION public.validate_salary_advance_self_repayment_update();

GRANT UPDATE ON public.employee_salary_advances TO authenticated;

DROP POLICY IF EXISTS "Employees can update own advance after wallet repayment" ON public.employee_salary_advances;
CREATE POLICY "Employees can update own advance after wallet repayment"
ON public.employee_salary_advances
FOR UPDATE
TO authenticated
USING (lower(employee_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())))
WITH CHECK (lower(employee_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE OR REPLACE FUNCTION public.can_insert_own_salary_advance_payment(
  _advance_id uuid,
  _employee_email text,
  _amount_paid numeric,
  _status text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_wallet_user_id text;
  v_recent_repayment numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_email IS NULL OR lower(v_email) <> lower(_employee_email) THEN
    RETURN false;
  END IF;

  IF COALESCE(_amount_paid, 0) <= 0 OR COALESCE(_status, '') <> 'approved' THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.employee_salary_advances esa
    WHERE esa.id = _advance_id
      AND lower(esa.employee_email) = lower(v_email)
  ) THEN
    RETURN false;
  END IF;

  v_wallet_user_id := COALESCE(public.get_unified_user_id(v_email), auth.uid()::text);

  SELECT COALESCE(SUM(abs(le.amount)), 0) INTO v_recent_repayment
  FROM public.ledger_entries le
  WHERE le.user_id = v_wallet_user_id
    AND le.amount < 0
    AND le.source_category = 'SALARY_ADVANCE_REPAYMENT'
    AND le.metadata->>'advance_id' = _advance_id::text
    AND le.created_at >= now() - interval '10 minutes';

  RETURN v_recent_repayment >= _amount_paid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_insert_own_salary_advance_payment(uuid, text, numeric, text) TO authenticated;
GRANT INSERT ON public.salary_advance_payments TO authenticated;

DROP POLICY IF EXISTS "Employees can insert own salary advance payment after wallet repayment" ON public.salary_advance_payments;
CREATE POLICY "Employees can insert own salary advance payment after wallet repayment"
ON public.salary_advance_payments
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_insert_own_salary_advance_payment(advance_id, employee_email, amount_paid, status)
);