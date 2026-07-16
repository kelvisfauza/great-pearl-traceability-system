
-- ============================================================
-- 1. BONUSES: restrict self-update to claim-only
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_bonuses_self_claim_only()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Admins / HR bypass (their own policy already gates them)
  IF EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
      AND status = 'Active'
      AND (role = ANY (ARRAY['Administrator','Super Admin']) OR department = 'Human Resources')
  ) THEN
    RETURN NEW;
  END IF;

  -- Non-admin self-update: only status -> 'claimed' and claimed_at may change
  IF NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.employee_email IS DISTINCT FROM OLD.employee_email
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
     OR NEW.employee_name IS DISTINCT FROM OLD.employee_name
     OR NEW.allocated_by IS DISTINCT FROM OLD.allocated_by
     OR NEW.allocated_at IS DISTINCT FROM OLD.allocated_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only admins may modify bonus details; you can only claim your bonus.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'claimed' THEN
    RAISE EXCEPTION 'You may only set bonus status to claimed.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_bonuses_self_claim_only_trg ON public.bonuses;
CREATE TRIGGER enforce_bonuses_self_claim_only_trg
  BEFORE UPDATE ON public.bonuses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bonuses_self_claim_only();

-- ============================================================
-- 2. CHRISTMAS VOUCHERS: restrict self-update to claim-only
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_vouchers_self_claim_only()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_current_user_administrator() THEN
    RETURN NEW;
  END IF;

  IF NEW.voucher_amount IS DISTINCT FROM OLD.voucher_amount
     OR NEW.performance_score IS DISTINCT FROM OLD.performance_score
     OR NEW.performance_rank IS DISTINCT FROM OLD.performance_rank
     OR NEW.employee_email IS DISTINCT FROM OLD.employee_email
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
     OR NEW.employee_name IS DISTINCT FROM OLD.employee_name
     OR NEW.voucher_code IS DISTINCT FROM OLD.voucher_code
     OR NEW.year IS DISTINCT FROM OLD.year
     OR NEW.christmas_message IS DISTINCT FROM OLD.christmas_message
     OR NEW.completed_by IS DISTINCT FROM OLD.completed_by
     OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
  THEN
    RAISE EXCEPTION 'Only admins may modify voucher details; you can only claim your voucher.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'claimed' THEN
    RAISE EXCEPTION 'You may only set voucher status to claimed.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_vouchers_self_claim_only_trg ON public.christmas_vouchers;
CREATE TRIGGER enforce_vouchers_self_claim_only_trg
  BEFORE UPDATE ON public.christmas_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vouchers_self_claim_only();

-- ============================================================
-- 3. OVERTIME AWARDS: restrict self-update to claim-only
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_overtime_self_claim_only()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_current_user_admin()
     OR public.user_has_permission('Human Resources')
     OR public.user_has_permission('Finance')
  THEN
    RETURN NEW;
  END IF;

  -- Non-privileged self-update: only status -> claimed permitted
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('claimed') THEN
    RAISE EXCEPTION 'You may only mark your overtime award as claimed.';
  END IF;

  -- Detect any change outside of status/claimed_at-like fields by comparing row minus status
  IF to_jsonb(NEW) - 'status' - 'updated_at' IS DISTINCT FROM to_jsonb(OLD) - 'status' - 'updated_at' THEN
    RAISE EXCEPTION 'Only HR/Finance/Admin may modify overtime award details.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_overtime_self_claim_only_trg ON public.overtime_awards;
CREATE TRIGGER enforce_overtime_self_claim_only_trg
  BEFORE UPDATE ON public.overtime_awards
  FOR EACH ROW EXECUTE FUNCTION public.enforce_overtime_self_claim_only();

-- ============================================================
-- 4. EMPLOYEE SALARY ADVANCES: remove employee self-update
-- ============================================================
DROP POLICY IF EXISTS "Employees can update own advance after wallet repayment" ON public.employee_salary_advances;
-- Finance/Admin manage policy remains; SECURITY DEFINER RPCs continue to work.

-- ============================================================
-- 5. LOAN REPAYMENTS: remove employee self-update
-- ============================================================
DROP POLICY IF EXISTS "Employees can update own repayments" ON public.loan_repayments;
-- Finance/Admin update policy remains; SECURITY DEFINER RPCs continue to work.

-- ============================================================
-- 6. LOANS: restrict employee self-update to non-critical fields
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_loans_self_update_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_current_user_admin() OR public.user_has_permission('Finance') THEN
    RETURN NEW;
  END IF;

  -- For everyone else (borrower / guarantor self-update via RLS),
  -- lock down financial and approval columns.
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

  -- Guarantor may only respond to their invitation, not repurpose the loan
  IF OLD.guarantor_email IS NOT NULL
     AND lower(OLD.guarantor_email) = public.get_current_user_email()
  THEN
    IF NEW.guarantor_email IS DISTINCT FROM OLD.guarantor_email
       OR NEW.guarantor_id IS DISTINCT FROM OLD.guarantor_id
       OR NEW.guarantor_name IS DISTINCT FROM OLD.guarantor_name
       OR NEW.guarantor_phone IS DISTINCT FROM OLD.guarantor_phone
    THEN
      RAISE EXCEPTION 'Guarantor identity fields are immutable.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_loans_self_update_guard_trg ON public.loans;
CREATE TRIGGER enforce_loans_self_update_guard_trg
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.enforce_loans_self_update_guard();

-- ============================================================
-- 7. FACILITATION REQUESTS: require requested_by = self on insert
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert facilitation_requests" ON public.facilitation_requests;

CREATE POLICY "Authenticated users can insert own facilitation_requests"
ON public.facilitation_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND requested_by = public.get_current_user_email()
);
