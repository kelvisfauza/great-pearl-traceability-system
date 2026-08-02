-- 1. BONUSES: claim-only self update
DROP POLICY IF EXISTS "Employees can claim their bonuses" ON public.bonuses;
CREATE POLICY "Employees can claim their bonuses"
ON public.bonuses
FOR UPDATE
TO authenticated
USING (
  employee_email = (SELECT e.email FROM public.employees e WHERE e.auth_user_id = auth.uid() LIMIT 1)
)
WITH CHECK (
  employee_email = (SELECT e.email FROM public.employees e WHERE e.auth_user_id = auth.uid() LIMIT 1)
  AND status = 'claimed'
);

-- 2. CHRISTMAS VOUCHERS: claim-only self update
DROP POLICY IF EXISTS "Users can claim their voucher" ON public.christmas_vouchers;
CREATE POLICY "Users can claim their voucher"
ON public.christmas_vouchers
FOR UPDATE
TO authenticated
USING (lower(employee_email) = public.current_user_email())
WITH CHECK (
  lower(employee_email) = public.current_user_email()
  AND status = 'claimed'
);

-- 3. OVERTIME AWARDS: claim-only self update
DROP POLICY IF EXISTS "Users can update their own overtime awards by email" ON public.overtime_awards;
CREATE POLICY "Users can update their own overtime awards by email"
ON public.overtime_awards
FOR UPDATE
TO authenticated
USING (lower(employee_email) = public.get_current_user_email())
WITH CHECK (
  lower(employee_email) = public.get_current_user_email()
  AND status = 'claimed'
);

-- allow the claim timestamp to move while still blocking every monetary field
CREATE OR REPLACE FUNCTION public.enforce_overtime_self_claim_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.is_current_user_admin()
     OR public.user_has_permission('Human Resources')
     OR public.user_has_permission('Finance')
  THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'claimed' THEN
    RAISE EXCEPTION 'You may only mark your overtime award as claimed.';
  END IF;

  IF (to_jsonb(NEW) - 'status' - 'claimed_at')
     IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'claimed_at') THEN
    RAISE EXCEPTION 'Only HR/Finance/Admin may modify overtime award details.';
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. LOANS: borrowers may not touch guarantor response fields
CREATE OR REPLACE FUNCTION public.enforce_loans_self_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.admin_approved IS DISTINCT FROM OLD.admin_approved
     OR NEW.employee_email IS DISTINCT FROM OLD.employee_email
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
  THEN
    RAISE EXCEPTION 'Only Finance/Admin can modify loan financial or approval fields.';
  END IF;

  -- Guarantor identity is immutable for everyone but Finance/Admin
  IF NEW.guarantor_email IS DISTINCT FROM OLD.guarantor_email
     OR NEW.guarantor_id IS DISTINCT FROM OLD.guarantor_id
     OR NEW.guarantor_name IS DISTINCT FROM OLD.guarantor_name
     OR NEW.guarantor_phone IS DISTINCT FROM OLD.guarantor_phone
  THEN
    RAISE EXCEPTION 'Guarantor identity fields are immutable.';
  END IF;

  -- Only the named guarantor may change guarantor response fields
  IF (NEW.guarantor_approved IS DISTINCT FROM OLD.guarantor_approved
      OR NEW.guarantor_declined IS DISTINCT FROM OLD.guarantor_declined)
     AND (OLD.guarantor_email IS NULL OR lower(OLD.guarantor_email) IS DISTINCT FROM v_email)
  THEN
    RAISE EXCEPTION 'Only the named guarantor may respond to this loan.';
  END IF;

  RETURN NEW;
END;
$function$;