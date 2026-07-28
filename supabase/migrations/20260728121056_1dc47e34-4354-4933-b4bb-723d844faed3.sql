CREATE OR REPLACE FUNCTION public.enforce_loans_self_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Backend/system context (service role, cron, SECURITY DEFINER RPCs):
  -- there is no authenticated end-user to guard against.
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