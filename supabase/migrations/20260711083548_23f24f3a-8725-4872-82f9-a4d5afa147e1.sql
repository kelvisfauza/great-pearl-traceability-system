CREATE OR REPLACE FUNCTION public.guard_loans_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE caller_email text;
BEGIN
  IF public.is_privileged_editor() THEN RETURN NEW; END IF;
  caller_email := (SELECT lower(email) FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1);

  IF caller_email IS NOT NULL AND caller_email = lower(COALESCE(OLD.guarantor_email, '')) THEN
    -- Guarantor: allow only guarantor response fields and the resulting status transition
    NEW.loan_amount := OLD.loan_amount;
    NEW.interest_rate := OLD.interest_rate;
    NEW.total_repayable := OLD.total_repayable;
    NEW.duration_months := OLD.duration_months;
    NEW.monthly_installment := OLD.monthly_installment;
    NEW.disbursed_amount := OLD.disbursed_amount;
    NEW.paid_amount := OLD.paid_amount;
    NEW.remaining_balance := OLD.remaining_balance;
    NEW.admin_approved := OLD.admin_approved;
    NEW.admin_approved_by := OLD.admin_approved_by;
    NEW.admin_approved_at := OLD.admin_approved_at;
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

    -- Only allow status to move to guarantor-decision states
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status NOT IN ('pending_admin','guarantor_declined') THEN
      NEW.status := OLD.status;
    END IF;

    -- Only allow admin_rejection_reason update on guarantor decline
    IF NEW.status <> 'guarantor_declined' THEN
      NEW.admin_rejection_reason := OLD.admin_rejection_reason;
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Employees cannot modify their own loan records. Contact Finance or Admin.';
END;
$$;