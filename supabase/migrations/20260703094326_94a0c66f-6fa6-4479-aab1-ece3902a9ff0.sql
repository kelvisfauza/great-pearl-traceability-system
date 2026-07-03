
CREATE OR REPLACE FUNCTION public.is_privileged_editor()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND status = 'Active'
      AND (
        role = ANY (ARRAY['Super Admin','Administrator','Manager'])
        OR 'Human Resources' = ANY (permissions)
        OR 'Finance' = ANY (permissions)
        OR department IN ('Human Resources','Finance')
      )
  );
$$;

-- absence_appeals guard
CREATE OR REPLACE FUNCTION public.guard_absence_appeals_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged_editor() THEN RETURN NEW; END IF;
  NEW.appeal_status := OLD.appeal_status;
  NEW.refund_ledger_reference := OLD.refund_ledger_reference;
  NEW.review_notes := OLD.review_notes;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.deduction_amount := OLD.deduction_amount;
  NEW.deduction_date := OLD.deduction_date;
  NEW.ledger_reference := OLD.ledger_reference;
  NEW.employee_id := OLD.employee_id;
  NEW.employee_email := OLD.employee_email;
  NEW.employee_name := OLD.employee_name;
  NEW.sms_sent := OLD.sms_sent;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_absence_appeals_self_update ON public.absence_appeals;
CREATE TRIGGER trg_guard_absence_appeals_self_update
BEFORE UPDATE ON public.absence_appeals
FOR EACH ROW EXECUTE FUNCTION public.guard_absence_appeals_self_update();

-- announcements SELECT
DROP POLICY IF EXISTS "Authenticated can view announcements" ON public.announcements;
CREATE POLICY "Users view targeted announcements"
ON public.announcements FOR SELECT TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Human Resources')
  OR (created_by = (SELECT email FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1))
  OR (
    (target_departments IS NULL OR array_length(target_departments, 1) IS NULL)
    AND (target_roles IS NULL OR array_length(target_roles, 1) IS NULL)
  )
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND (
        e.department = ANY (COALESCE(target_departments, '{}'::text[]))
        OR e.role = ANY (COALESCE(target_roles, '{}'::text[]))
      )
  )
);

-- bonuses guard
CREATE OR REPLACE FUNCTION public.guard_bonuses_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged_editor() THEN RETURN NEW; END IF;
  NEW.amount := OLD.amount;
  NEW.reason := OLD.reason;
  NEW.employee_id := OLD.employee_id;
  NEW.employee_email := OLD.employee_email;
  NEW.employee_name := OLD.employee_name;
  NEW.allocated_by := OLD.allocated_by;
  NEW.allocated_at := OLD.allocated_at;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'claimed' THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_bonuses_self_update ON public.bonuses;
CREATE TRIGGER trg_guard_bonuses_self_update
BEFORE UPDATE ON public.bonuses
FOR EACH ROW EXECUTE FUNCTION public.guard_bonuses_self_update();

-- christmas_vouchers guard
CREATE OR REPLACE FUNCTION public.guard_christmas_vouchers_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged_editor() THEN RETURN NEW; END IF;
  NEW.voucher_amount := OLD.voucher_amount;
  NEW.performance_rank := OLD.performance_rank;
  NEW.performance_score := OLD.performance_score;
  NEW.christmas_message := OLD.christmas_message;
  NEW.voucher_code := OLD.voucher_code;
  NEW.year := OLD.year;
  NEW.employee_id := OLD.employee_id;
  NEW.employee_email := OLD.employee_email;
  NEW.employee_name := OLD.employee_name;
  NEW.completed_by := OLD.completed_by;
  NEW.completed_at := OLD.completed_at;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'claimed' THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_christmas_vouchers_self_update ON public.christmas_vouchers;
CREATE TRIGGER trg_guard_christmas_vouchers_self_update
BEFORE UPDATE ON public.christmas_vouchers
FOR EACH ROW EXECUTE FUNCTION public.guard_christmas_vouchers_self_update();

-- loans guard
CREATE OR REPLACE FUNCTION public.guard_loans_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller_email text;
BEGIN
  IF public.is_privileged_editor() THEN RETURN NEW; END IF;
  caller_email := (SELECT lower(email) FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1);

  IF caller_email IS NOT NULL AND caller_email = lower(COALESCE(OLD.guarantor_email, '')) THEN
    -- guarantor: only guarantor_approved/declined/at may change
    NEW.loan_amount := OLD.loan_amount;
    NEW.interest_rate := OLD.interest_rate;
    NEW.total_repayable := OLD.total_repayable;
    NEW.duration_months := OLD.duration_months;
    NEW.monthly_installment := OLD.monthly_installment;
    NEW.disbursed_amount := OLD.disbursed_amount;
    NEW.paid_amount := OLD.paid_amount;
    NEW.remaining_balance := OLD.remaining_balance;
    NEW.status := OLD.status;
    NEW.admin_approved := OLD.admin_approved;
    NEW.admin_approved_by := OLD.admin_approved_by;
    NEW.admin_approved_at := OLD.admin_approved_at;
    NEW.admin_rejection_reason := OLD.admin_rejection_reason;
    NEW.guarantor_approval_code := OLD.guarantor_approval_code;
    NEW.employee_id := OLD.employee_id;
    NEW.employee_email := OLD.employee_email;
    NEW.employee_name := OLD.employee_name;
    NEW.employee_phone := OLD.employee_phone;
    NEW.guarantor_email := OLD.guarantor_email;
    NEW.guarantor_id := OLD.guarantor_id;
    NEW.guarantor_name := OLD.guarantor_name;
    NEW.guarantor_phone := OLD.guarantor_phone;
    NEW.start_date := OLD.start_date;
    NEW.end_date := OLD.end_date;
    NEW.next_deduction_date := OLD.next_deduction_date;
    NEW.missed_installments := OLD.missed_installments;
    NEW.penalty_amount := OLD.penalty_amount;
    NEW.is_defaulted := OLD.is_defaulted;
    NEW.counter_offer_amount := OLD.counter_offer_amount;
    NEW.counter_offer_by := OLD.counter_offer_by;
    NEW.counter_offer_at := OLD.counter_offer_at;
    NEW.counter_offer_comments := OLD.counter_offer_comments;
    NEW.approved_via_appeal := OLD.approved_via_appeal;
    NEW.appeal_admin_voters := OLD.appeal_admin_voters;
    NEW.appeal_id := OLD.appeal_id;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Employees cannot modify their own loan records. Contact Finance or Admin.';
END; $$;
DROP TRIGGER IF EXISTS trg_guard_loans_self_update ON public.loans;
CREATE TRIGGER trg_guard_loans_self_update
BEFORE UPDATE ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.guard_loans_self_update();

-- overtime_awards guard
CREATE OR REPLACE FUNCTION public.guard_overtime_awards_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_privileged_editor() THEN RETURN NEW; END IF;
  NEW.hours := OLD.hours;
  NEW.minutes := OLD.minutes;
  NEW.total_amount := OLD.total_amount;
  NEW.reference_number := OLD.reference_number;
  NEW.employee_id := OLD.employee_id;
  NEW.employee_email := OLD.employee_email;
  NEW.employee_name := OLD.employee_name;
  NEW.department := OLD.department;
  NEW.completed_at := OLD.completed_at;
  NEW.completed_by := OLD.completed_by;
  NEW.created_by := OLD.created_by;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'claimed' THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_overtime_awards_self_update ON public.overtime_awards;
CREATE TRIGGER trg_guard_overtime_awards_self_update
BEFORE UPDATE ON public.overtime_awards
FOR EACH ROW EXECUTE FUNCTION public.guard_overtime_awards_self_update();
