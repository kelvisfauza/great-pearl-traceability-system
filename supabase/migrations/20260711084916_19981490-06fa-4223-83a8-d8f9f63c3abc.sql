-- Allow service_role (auth.uid() IS NULL) to bypass the guarantor guard so
-- edge functions / admin scripts can fix stuck loans. Also fix Onesmus's loan
-- whose status did not advance despite guarantor approval.

CREATE OR REPLACE FUNCTION public.guard_loans_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE caller_email text;
BEGIN
  -- Service role / backend contexts have no auth.uid(); allow all updates.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF public.is_privileged_editor() THEN RETURN NEW; END IF;
  caller_email := (SELECT lower(email) FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1);

  IF caller_email IS NOT NULL AND caller_email = lower(COALESCE(OLD.guarantor_email, '')) THEN
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

    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status NOT IN ('pending_admin','guarantor_declined') THEN
      NEW.status := OLD.status;
    END IF;

    IF NEW.status <> 'guarantor_declined' THEN
      NEW.admin_rejection_reason := OLD.admin_rejection_reason;
    END IF;

    RETURN NEW;
  END IF;

  -- Employee (borrower) editing their own loan: block
  RAISE EXCEPTION 'Employees cannot modify their own loan records. Contact Finance or Admin.';
END;
$function$;

-- Fix Onesmus's stuck loan (guarantor already approved on 2026-07-11)
UPDATE public.loans
SET status = 'pending_admin'
WHERE id = 'e8c4a9d2-00b5-4a76-a08f-74107fe53b82'
  AND guarantor_approved = true
  AND status = 'pending_guarantor';