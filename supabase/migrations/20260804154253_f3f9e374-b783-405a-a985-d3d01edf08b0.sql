
-- 1. BONUSES: employees may only flip status to claimed
CREATE OR REPLACE FUNCTION public.guard_bonus_self_claim()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM employees e WHERE e.auth_user_id = auth.uid()
      AND ((e.role = ANY (ARRAY['Administrator','Super Admin'])) OR e.department = 'Human Resources')
      AND e.status = 'Active') THEN
    RETURN NEW;
  END IF;
  IF NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.employee_email IS DISTINCT FROM OLD.employee_email
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
     OR NEW.employee_name IS DISTINCT FROM OLD.employee_name
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.allocated_by IS DISTINCT FROM OLD.allocated_by
     OR NEW.allocated_at IS DISTINCT FROM OLD.allocated_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only the claim status may be changed on your own bonus';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_bonus_self_claim_trg ON public.bonuses;
CREATE TRIGGER guard_bonus_self_claim_trg BEFORE UPDATE ON public.bonuses
FOR EACH ROW EXECUTE FUNCTION public.guard_bonus_self_claim();

-- 2. CHRISTMAS VOUCHERS
CREATE OR REPLACE FUNCTION public.guard_voucher_self_claim()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_current_user_administrator() THEN
    RETURN NEW;
  END IF;
  IF NEW.voucher_amount IS DISTINCT FROM OLD.voucher_amount
     OR NEW.employee_email IS DISTINCT FROM OLD.employee_email
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
     OR NEW.employee_name IS DISTINCT FROM OLD.employee_name
     OR NEW.voucher_code IS DISTINCT FROM OLD.voucher_code
     OR NEW.performance_score IS DISTINCT FROM OLD.performance_score
     OR NEW.performance_rank IS DISTINCT FROM OLD.performance_rank
     OR NEW.year IS DISTINCT FROM OLD.year
     OR NEW.completed_by IS DISTINCT FROM OLD.completed_by
     OR NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    RAISE EXCEPTION 'Only the claim status may be changed on your own voucher';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_voucher_self_claim_trg ON public.christmas_vouchers;
CREATE TRIGGER guard_voucher_self_claim_trg BEFORE UPDATE ON public.christmas_vouchers
FOR EACH ROW EXECUTE FUNCTION public.guard_voucher_self_claim();

-- 3. OVERTIME AWARDS
CREATE OR REPLACE FUNCTION public.guard_overtime_self_claim()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_current_user_admin()
     OR public.user_has_permission('Human Resources')
     OR public.user_has_permission('Finance') THEN
    RETURN NEW;
  END IF;
  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount
     OR NEW.hours IS DISTINCT FROM OLD.hours
     OR NEW.minutes IS DISTINCT FROM OLD.minutes
     OR NEW.employee_email IS DISTINCT FROM OLD.employee_email
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
     OR NEW.employee_name IS DISTINCT FROM OLD.employee_name
     OR NEW.department IS DISTINCT FROM OLD.department
     OR NEW.reference_number IS DISTINCT FROM OLD.reference_number
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.completed_by IS DISTINCT FROM OLD.completed_by
     OR NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    RAISE EXCEPTION 'Only the claim status may be changed on your own overtime award';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_overtime_self_claim_trg ON public.overtime_awards;
CREATE TRIGGER guard_overtime_self_claim_trg BEFORE UPDATE ON public.overtime_awards
FOR EACH ROW EXECUTE FUNCTION public.guard_overtime_self_claim();

-- 4. ABSENCE APPEALS: employees may only submit an appeal, never review it
CREATE OR REPLACE FUNCTION public.guard_absence_appeal_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM employees e WHERE e.auth_user_id = auth.uid()
      AND e.role = ANY (ARRAY['Super Admin','Administrator','HR'])) THEN
    RETURN NEW;
  END IF;
  IF NEW.deduction_amount IS DISTINCT FROM OLD.deduction_amount
     OR NEW.employee_email IS DISTINCT FROM OLD.employee_email
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
     OR NEW.employee_name IS DISTINCT FROM OLD.employee_name
     OR NEW.deduction_date IS DISTINCT FROM OLD.deduction_date
     OR NEW.ledger_reference IS DISTINCT FROM OLD.ledger_reference
     OR NEW.refund_ledger_reference IS DISTINCT FROM OLD.refund_ledger_reference
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.review_notes IS DISTINCT FROM OLD.review_notes THEN
    RAISE EXCEPTION 'Employees may only submit an appeal, not review it';
  END IF;
  IF NEW.appeal_status IS DISTINCT FROM OLD.appeal_status
     AND NEW.appeal_status NOT IN ('pending','submitted') THEN
    RAISE EXCEPTION 'Only HR or an administrator can decide an appeal';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_absence_appeal_self_update_trg ON public.absence_appeals;
CREATE TRIGGER guard_absence_appeal_self_update_trg BEFORE UPDATE ON public.absence_appeals
FOR EACH ROW EXECUTE FUNCTION public.guard_absence_appeal_self_update();

-- 5. LOANS: borrower/guarantor may only respond, never change terms or approvals
CREATE OR REPLACE FUNCTION public.guard_loan_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_current_user_admin() OR public.user_has_permission('Finance') THEN
    RETURN NEW;
  END IF;
  IF NEW.loan_amount IS DISTINCT FROM OLD.loan_amount
     OR NEW.original_loan_amount IS DISTINCT FROM OLD.original_loan_amount
     OR NEW.interest_rate IS DISTINCT FROM OLD.interest_rate
     OR NEW.daily_interest_rate IS DISTINCT FROM OLD.daily_interest_rate
     OR NEW.total_repayable IS DISTINCT FROM OLD.total_repayable
     OR NEW.remaining_balance IS DISTINCT FROM OLD.remaining_balance
     OR NEW.paid_amount IS DISTINCT FROM OLD.paid_amount
     OR NEW.penalty_amount IS DISTINCT FROM OLD.penalty_amount
     OR NEW.disbursed_amount IS DISTINCT FROM OLD.disbursed_amount
     OR NEW.monthly_installment IS DISTINCT FROM OLD.monthly_installment
     OR NEW.weekly_installment IS DISTINCT FROM OLD.weekly_installment
     OR NEW.duration_months IS DISTINCT FROM OLD.duration_months
     OR NEW.total_weeks IS DISTINCT FROM OLD.total_weeks
     OR NEW.admin_approved IS DISTINCT FROM OLD.admin_approved
     OR NEW.admin_approved_by IS DISTINCT FROM OLD.admin_approved_by
     OR NEW.admin_approved_at IS DISTINCT FROM OLD.admin_approved_at
     OR NEW.admin_rejection_reason IS DISTINCT FROM OLD.admin_rejection_reason
     OR NEW.approved_via_appeal IS DISTINCT FROM OLD.approved_via_appeal
     OR NEW.appeal_admin_voters IS DISTINCT FROM OLD.appeal_admin_voters
     OR NEW.counter_offer_amount IS DISTINCT FROM OLD.counter_offer_amount
     OR NEW.counter_offer_by IS DISTINCT FROM OLD.counter_offer_by
     OR NEW.counter_offer_at IS DISTINCT FROM OLD.counter_offer_at
     OR NEW.is_defaulted IS DISTINCT FROM OLD.is_defaulted
     OR NEW.missed_installments IS DISTINCT FROM OLD.missed_installments
     OR NEW.employee_email IS DISTINCT FROM OLD.employee_email
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
     OR NEW.guarantor_email IS DISTINCT FROM OLD.guarantor_email
     OR NEW.guarantor_id IS DISTINCT FROM OLD.guarantor_id
     OR NEW.loan_type IS DISTINCT FROM OLD.loan_type
     OR NEW.start_date IS DISTINCT FROM OLD.start_date
     OR NEW.end_date IS DISTINCT FROM OLD.end_date
     OR NEW.next_deduction_date IS DISTINCT FROM OLD.next_deduction_date THEN
    RAISE EXCEPTION 'Loan terms and approvals can only be changed by Finance or an administrator';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('cancelled','guarantor_declined','pending_guarantor','pending_admin') THEN
    RAISE EXCEPTION 'You cannot set this loan status';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_loan_self_update_trg ON public.loans;
CREATE TRIGGER guard_loan_self_update_trg BEFORE UPDATE ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.guard_loan_self_update();

-- 6. MODIFICATION REQUESTS: requester must be the caller
DROP POLICY IF EXISTS "Users can create modification requests" ON public.modification_requests;
CREATE POLICY "Users can create modification requests"
ON public.modification_requests FOR INSERT TO authenticated
WITH CHECK (requested_by = public.get_current_user_email() OR public.is_finance_or_admin());
