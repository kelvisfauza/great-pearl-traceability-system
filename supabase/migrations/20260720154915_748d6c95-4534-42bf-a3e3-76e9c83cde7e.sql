
-- 1. EUDR dispatch reports: restrict updates to creator or Logistics/Store/Admin
DROP POLICY IF EXISTS "Creators can update their own reports" ON public.eudr_dispatch_reports;
CREATE POLICY "Creators or logistics/store/admin can update reports"
ON public.eudr_dispatch_reports
FOR UPDATE
USING (
  created_by = auth.uid()::text
  OR user_has_permission('Logistics')
  OR user_has_permission('Store Management')
  OR is_current_user_admin()
)
WITH CHECK (
  created_by = auth.uid()::text
  OR user_has_permission('Logistics')
  OR user_has_permission('Store Management')
  OR is_current_user_admin()
);

-- 2. Loans: replace overly-permissive self-update with a column-guard trigger.
DROP POLICY IF EXISTS "Employees can update own loans" ON public.loans;
CREATE POLICY "Employees can respond to loans"
ON public.loans
FOR UPDATE
USING (
  (employee_email = get_current_user_email())
  OR (guarantor_email = get_current_user_email())
)
WITH CHECK (
  (employee_email = get_current_user_email())
  OR (guarantor_email = get_current_user_email())
);

CREATE OR REPLACE FUNCTION public.guard_loans_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email text := get_current_user_email();
BEGIN
  -- Bypass guard for Finance/Admin
  IF user_has_permission('Finance') OR is_current_user_admin() THEN
    RETURN NEW;
  END IF;

  -- Borrower cannot change privileged fields
  IF caller_email = OLD.employee_email THEN
    IF NEW.loan_amount IS DISTINCT FROM OLD.loan_amount
      OR NEW.disbursed_amount IS DISTINCT FROM OLD.disbursed_amount
      OR NEW.paid_amount IS DISTINCT FROM OLD.paid_amount
      OR NEW.remaining_balance IS DISTINCT FROM OLD.remaining_balance
      OR NEW.total_repayable IS DISTINCT FROM OLD.total_repayable
      OR NEW.interest_rate IS DISTINCT FROM OLD.interest_rate
      OR NEW.monthly_installment IS DISTINCT FROM OLD.monthly_installment
      OR NEW.weekly_installment IS DISTINCT FROM OLD.weekly_installment
      OR NEW.duration_months IS DISTINCT FROM OLD.duration_months
      OR NEW.total_weeks IS DISTINCT FROM OLD.total_weeks
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.admin_approved IS DISTINCT FROM OLD.admin_approved
      OR NEW.admin_approved_by IS DISTINCT FROM OLD.admin_approved_by
      OR NEW.admin_approved_at IS DISTINCT FROM OLD.admin_approved_at
      OR NEW.penalty_amount IS DISTINCT FROM OLD.penalty_amount
      OR NEW.is_defaulted IS DISTINCT FROM OLD.is_defaulted
      OR NEW.missed_installments IS DISTINCT FROM OLD.missed_installments
      OR NEW.counter_offer_amount IS DISTINCT FROM OLD.counter_offer_amount
      OR NEW.approved_via_appeal IS DISTINCT FROM OLD.approved_via_appeal
      OR NEW.employee_email IS DISTINCT FROM OLD.employee_email
      OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
    THEN
      RAISE EXCEPTION 'Borrowers cannot modify loan financial or approval fields';
    END IF;
  END IF;

  -- Guarantor: only allow acceptance/decline fields
  IF caller_email = OLD.guarantor_email AND caller_email <> COALESCE(OLD.employee_email, '') THEN
    IF NEW.loan_amount IS DISTINCT FROM OLD.loan_amount
      OR NEW.disbursed_amount IS DISTINCT FROM OLD.disbursed_amount
      OR NEW.remaining_balance IS DISTINCT FROM OLD.remaining_balance
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.admin_approved IS DISTINCT FROM OLD.admin_approved
      OR NEW.employee_email IS DISTINCT FROM OLD.employee_email
      OR NEW.guarantor_email IS DISTINCT FROM OLD.guarantor_email
    THEN
      RAISE EXCEPTION 'Guarantors can only accept or decline the loan';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_loans_self_update ON public.loans;
CREATE TRIGGER trg_guard_loans_self_update
BEFORE UPDATE ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.guard_loans_self_update();

-- 3. Supplier contract deliveries: restrict to Finance/Procurement/Admin
DROP POLICY IF EXISTS "Allow all access to supplier_contract_deliveries" ON public.supplier_contract_deliveries;
CREATE POLICY "Finance/Procurement/Admin can view deliveries"
ON public.supplier_contract_deliveries
FOR SELECT
USING (user_has_permission('Finance') OR user_has_permission('Procurement') OR is_current_user_admin());
CREATE POLICY "Finance/Procurement/Admin can insert deliveries"
ON public.supplier_contract_deliveries
FOR INSERT
WITH CHECK (user_has_permission('Finance') OR user_has_permission('Procurement') OR is_current_user_admin());
CREATE POLICY "Finance/Procurement/Admin can update deliveries"
ON public.supplier_contract_deliveries
FOR UPDATE
USING (user_has_permission('Finance') OR user_has_permission('Procurement') OR is_current_user_admin())
WITH CHECK (user_has_permission('Finance') OR user_has_permission('Procurement') OR is_current_user_admin());
CREATE POLICY "Finance/Procurement/Admin can delete deliveries"
ON public.supplier_contract_deliveries
FOR DELETE
USING (user_has_permission('Finance') OR user_has_permission('Procurement') OR is_current_user_admin());

-- 4. User accounts: enforce ownership on insert
DROP POLICY IF EXISTS "System can insert user accounts" ON public.user_accounts;
CREATE POLICY "Users can insert own account"
ON public.user_accounts
FOR INSERT
WITH CHECK (user_id = (auth.uid())::text);

-- 5. Bonuses & vouchers: pin financial fields on self-claim via trigger
CREATE OR REPLACE FUNCTION public.guard_bonus_self_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email text := (SELECT email FROM employees WHERE auth_user_id = auth.uid() LIMIT 1);
BEGIN
  IF EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
      AND ((role = ANY (ARRAY['Administrator','Super Admin'])) OR department = 'Human Resources')
      AND status = 'Active'
  ) THEN
    RETURN NEW;
  END IF;

  IF caller_email IS NOT NULL AND caller_email = OLD.employee_email THEN
    IF NEW.amount IS DISTINCT FROM OLD.amount
      OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
      OR NEW.employee_email IS DISTINCT FROM OLD.employee_email
      OR NEW.employee_name IS DISTINCT FROM OLD.employee_name
      OR NEW.reason IS DISTINCT FROM OLD.reason
      OR NEW.allocated_by IS DISTINCT FROM OLD.allocated_by
      OR NEW.allocated_at IS DISTINCT FROM OLD.allocated_at
    THEN
      RAISE EXCEPTION 'Employees can only claim bonuses, not modify amounts or award fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_bonus_self_claim ON public.bonuses;
CREATE TRIGGER trg_guard_bonus_self_claim
BEFORE UPDATE ON public.bonuses
FOR EACH ROW EXECUTE FUNCTION public.guard_bonus_self_claim();

CREATE OR REPLACE FUNCTION public.guard_voucher_self_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_current_user_administrator() THEN
    RETURN NEW;
  END IF;

  IF lower(OLD.employee_email) = current_user_email() THEN
    IF NEW.voucher_amount IS DISTINCT FROM OLD.voucher_amount
      OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
      OR NEW.employee_email IS DISTINCT FROM OLD.employee_email
      OR NEW.employee_name IS DISTINCT FROM OLD.employee_name
      OR NEW.voucher_code IS DISTINCT FROM OLD.voucher_code
      OR NEW.performance_rank IS DISTINCT FROM OLD.performance_rank
      OR NEW.performance_score IS DISTINCT FROM OLD.performance_score
      OR NEW.year IS DISTINCT FROM OLD.year
    THEN
      RAISE EXCEPTION 'Employees can only claim vouchers, not modify amounts or award fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_voucher_self_claim ON public.christmas_vouchers;
CREATE TRIGGER trg_guard_voucher_self_claim
BEFORE UPDATE ON public.christmas_vouchers
FOR EACH ROW EXECUTE FUNCTION public.guard_voucher_self_claim();
