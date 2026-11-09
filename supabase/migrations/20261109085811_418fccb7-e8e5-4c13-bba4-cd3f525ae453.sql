CREATE SCHEMA IF NOT EXISTS loan_approval_private;
REVOKE ALL ON SCHEMA loan_approval_private FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION loan_approval_private.guard_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE actor text := lower(coalesce(public.get_current_user_email(),'')); required_guarantors integer;
BEGIN
 IF TG_OP='INSERT' THEN RETURN NEW; END IF;
 IF NOT ((NEW.admin_approved IS TRUE AND OLD.admin_approved IS NOT TRUE) OR (NEW.status IN ('approved','active','disbursed') AND OLD.status NOT IN ('approved','active','disbursed','completed','paid_off','defaulted','topped_up'))) THEN RETURN NEW; END IF;
 -- Trusted scheduled/appeal services retain their separate validated lifecycle.
 IF current_setting('role',true)='service_role' OR (auth.uid() IS NULL AND session_user IN ('postgres','supabase_admin')) THEN RETURN NEW; END IF;
 IF auth.uid() IS NULL OR NOT coalesce(public.is_current_user_admin(),false) THEN RAISE EXCEPTION 'Only signed-in administrators can approve loans'; END IF;
 IF actor=lower(coalesce(OLD.employee_email,'')) THEN RAISE EXCEPTION 'You cannot approve your own loan'; END IF;
 IF actor IN (lower(coalesce(OLD.guarantor_email,'')),lower(coalesce(OLD.guarantor2_email,''))) THEN RAISE EXCEPTION 'You cannot approve a loan you guaranteed'; END IF;
 IF OLD.status <> 'pending_admin' OR coalesce(OLD.admin_approved,false) THEN RAISE EXCEPTION 'This loan is not awaiting administrator approval'; END IF;
 required_guarantors := CASE coalesce(OLD.loan_type,'quick') WHEN 'pure_salary' THEN 0 WHEN 'business' THEN 2 ELSE 1 END;
 IF required_guarantors>=1 AND (nullif(trim(OLD.guarantor_email),'') IS NULL OR OLD.guarantor_approved IS NOT TRUE OR coalesce(OLD.guarantor_declined,false) OR lower(OLD.guarantor_email)=lower(OLD.employee_email)) THEN RAISE EXCEPTION 'The required guarantor must approve first'; END IF;
 IF required_guarantors>=2 AND (nullif(trim(OLD.guarantor2_email),'') IS NULL OR OLD.guarantor2_approved IS NOT TRUE OR coalesce(OLD.guarantor2_declined,false) OR lower(OLD.guarantor2_email) IN (lower(OLD.employee_email),lower(OLD.guarantor_email))) THEN RAISE EXCEPTION 'Both distinct guarantors must approve first'; END IF;
 IF OLD.terms_accepted IS NOT TRUE OR nullif(trim(OLD.terms_signature),'') IS NULL THEN RAISE EXCEPTION 'The borrower must sign the loan terms first'; END IF;
 IF OLD.revision_amount IS NOT NULL AND (OLD.revision_signed_at IS NULL OR nullif(trim(OLD.revision_signature),'') IS NULL OR nullif(trim(OLD.revision_declined_reason),'') IS NOT NULL) THEN RAISE EXCEPTION 'The borrower must accept and sign the revised terms first'; END IF;
 NEW.admin_approved_by := public.get_current_user_email(); NEW.admin_approved_at := now();
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION loan_approval_private.guard_decision() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER loan_admin_decision_guard BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION loan_approval_private.guard_decision();