DROP POLICY IF EXISTS "Employees view own loans" ON public.loans;
CREATE POLICY "Employees view own loans" ON public.loans FOR SELECT
USING (
  (employee_email = get_current_user_email())
  OR (guarantor_email = get_current_user_email())
  OR (guarantor2_email = get_current_user_email())
  OR user_has_permission('Finance'::text)
  OR is_current_user_admin()
);

DROP POLICY IF EXISTS "Employees can respond to loans" ON public.loans;
CREATE POLICY "Employees can respond to loans" ON public.loans FOR UPDATE
USING (
  (employee_email = get_current_user_email())
  OR (guarantor_email = get_current_user_email())
  OR (guarantor2_email = get_current_user_email())
);

CREATE OR REPLACE FUNCTION public.enforce_loan_self_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := public.get_current_user_email();
BEGIN
  IF auth.uid() IS NULL OR current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.is_current_user_admin() OR public.user_has_permission('Finance') THEN
    RETURN NEW;
  END IF;

  IF NEW.loan_amount IS DISTINCT FROM OLD.loan_amount
     OR NEW.interest_rate IS DISTINCT FROM OLD.interest_rate
     OR NEW.total_repayable IS DISTINCT FROM OLD.total_repayable
     OR NEW.duration_months IS DISTINCT FROM OLD.duration_months
     OR NEW.monthly_installment IS DISTINCT FROM OLD.monthly_installment
     OR NEW.disbursed_amount IS DISTINCT FROM OLD.disbursed_amount
     OR NEW.paid_amount IS DISTINCT FROM OLD.paid_amount
     OR NEW.remaining_balance IS DISTINCT FROM OLD.remaining_balance
     OR NEW.admin_approved IS DISTINCT FROM OLD.admin_approved
     OR NEW.employee_email IS DISTINCT FROM OLD.employee_email
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
  THEN
    RAISE EXCEPTION 'Only Finance/Admin can modify loan financial or approval fields.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('cancelled','declined','pending','pending_admin','pending_guarantor','guarantor_declined')
  THEN
    RAISE EXCEPTION 'Only Finance/Admin can change loan status to %', NEW.status;
  END IF;

  -- Guarantor identity is immutable for everyone but Finance/Admin, except the
  -- borrower replacing a guarantor who declined.
  IF (NEW.guarantor_email IS DISTINCT FROM OLD.guarantor_email
      OR NEW.guarantor_id IS DISTINCT FROM OLD.guarantor_id
      OR NEW.guarantor_name IS DISTINCT FROM OLD.guarantor_name
      OR NEW.guarantor_phone IS DISTINCT FROM OLD.guarantor_phone
      OR NEW.guarantor2_email IS DISTINCT FROM OLD.guarantor2_email
      OR NEW.guarantor2_id IS DISTINCT FROM OLD.guarantor2_id
      OR NEW.guarantor2_name IS DISTINCT FROM OLD.guarantor2_name
      OR NEW.guarantor2_phone IS DISTINCT FROM OLD.guarantor2_phone)
     AND lower(COALESCE(OLD.employee_email,'')) IS DISTINCT FROM v_email
  THEN
    RAISE EXCEPTION 'Guarantor identity fields are immutable.';
  END IF;

  -- Only the named primary guarantor may change primary guarantor response fields
  IF (NEW.guarantor_approved IS DISTINCT FROM OLD.guarantor_approved
      OR NEW.guarantor_declined IS DISTINCT FROM OLD.guarantor_declined)
     AND (OLD.guarantor_email IS NULL OR lower(OLD.guarantor_email) IS DISTINCT FROM v_email)
  THEN
    RAISE EXCEPTION 'Only the named guarantor may respond to this loan.';
  END IF;

  -- Only the named second guarantor may change second guarantor response fields
  IF (NEW.guarantor2_approved IS DISTINCT FROM OLD.guarantor2_approved)
     AND (OLD.guarantor2_email IS NULL OR lower(OLD.guarantor2_email) IS DISTINCT FROM v_email)
  THEN
    RAISE EXCEPTION 'Only the named second guarantor may respond to this loan.';
  END IF;

  RETURN NEW;
END;
$$;