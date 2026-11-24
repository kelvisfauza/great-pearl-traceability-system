CREATE OR REPLACE FUNCTION public.sg_guard_loan_self_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  allowed text[] := ARRAY[
    'guarantor_approved','guarantor_approved_at','guarantor_declined',
    'guarantor_approval_code',
    'guarantor2_approved','guarantor2_approved_at','guarantor2_declined',
    'guarantor2_approval_code',
    'admin_rejection_reason','status','updated_at'
  ];
  v_email text := lower(coalesce(public.get_current_user_email(), ''));
BEGIN
  IF public.sg_is_automation() THEN RETURN NEW; END IF;
  IF public.is_current_user_admin() OR public.user_has_permission('Finance') THEN RETURN NEW; END IF;

  -- Borrower response to a management counter offer or revised terms; figures
  -- come from the saved offer inside the borrower-checked loan routines.
  IF current_setting('app.loan_counter_accept', true) = OLD.id::text THEN RETURN NEW; END IF;

  IF lower(coalesce(OLD.employee_email,'')) = v_email
     AND OLD.status IN ('pending_guarantor','pending_admin')
     AND nullif(trim(coalesce(OLD.terms_signature,'')),'') IS NULL
     AND nullif(trim(coalesce(NEW.terms_signature,'')),'') IS NOT NULL
     AND NEW.terms_accepted IS TRUE THEN
    allowed := allowed || ARRAY['terms_accepted','terms_accepted_at','terms_version','terms_signature'];
  END IF;

  IF (to_jsonb(OLD) - allowed) IS DISTINCT FROM (to_jsonb(NEW) - allowed) THEN
    RAISE EXCEPTION 'Only Finance/Admin may change loan amounts, balances, interest or approval fields.';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('cancelled','declined','pending','pending_admin','pending_guarantor','guarantor_declined') THEN
    RAISE EXCEPTION 'Only Finance/Admin may set loan status to %.', NEW.status;
  END IF;
  IF (NEW.guarantor_approved IS DISTINCT FROM OLD.guarantor_approved
      OR NEW.guarantor_declined IS DISTINCT FROM OLD.guarantor_declined
      OR NEW.guarantor_approved_at IS DISTINCT FROM OLD.guarantor_approved_at)
     AND (OLD.guarantor_email IS NULL OR lower(OLD.guarantor_email) <> v_email) THEN
    RAISE EXCEPTION 'Only the named guarantor may respond to this loan.';
  END IF;
  IF (NEW.guarantor2_approved IS DISTINCT FROM OLD.guarantor2_approved
      OR NEW.guarantor2_declined IS DISTINCT FROM OLD.guarantor2_declined
      OR NEW.guarantor2_approved_at IS DISTINCT FROM OLD.guarantor2_approved_at)
     AND (OLD.guarantor2_email IS NULL OR lower(OLD.guarantor2_email) <> v_email) THEN
    RAISE EXCEPTION 'Only the named second guarantor may respond to this loan.';
  END IF;
  IF NEW.guarantor_approval_code IS DISTINCT FROM OLD.guarantor_approval_code
     OR NEW.guarantor2_approval_code IS DISTINCT FROM OLD.guarantor2_approval_code THEN
    IF lower(coalesce(OLD.employee_email,'')) <> v_email THEN
      RAISE EXCEPTION 'Approval codes may not be modified.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;