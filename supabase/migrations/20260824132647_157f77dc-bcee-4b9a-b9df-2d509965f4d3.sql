CREATE OR REPLACE FUNCTION public.sg_guard_loan_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  IF public.sg_is_automation() THEN
    RETURN NEW;
  END IF;

  IF public.is_current_user_admin() OR public.user_has_permission('Finance') THEN
    RETURN NEW;
  END IF;

  -- Everything outside the guarantor-response allow-list is locked:
  -- amounts, balances, interest, admin_approved, counter offers, identities.
  IF (to_jsonb(OLD) - allowed) IS DISTINCT FROM (to_jsonb(NEW) - allowed) THEN
    RAISE EXCEPTION 'Only Finance/Admin may change loan amounts, balances, interest or approval fields.';
  END IF;

  -- Borrowers/guarantors may only cancel or decline, never approve/disburse.
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status NOT IN ('cancelled','declined','pending','pending_admin','pending_guarantor','guarantor_declined') THEN
    RAISE EXCEPTION 'Only Finance/Admin may set loan status to %.', NEW.status;
  END IF;

  -- Only the named primary guarantor may record a primary guarantor response.
  IF (NEW.guarantor_approved IS DISTINCT FROM OLD.guarantor_approved
      OR NEW.guarantor_declined IS DISTINCT FROM OLD.guarantor_declined
      OR NEW.guarantor_approved_at IS DISTINCT FROM OLD.guarantor_approved_at)
     AND (OLD.guarantor_email IS NULL OR lower(OLD.guarantor_email) <> v_email) THEN
    RAISE EXCEPTION 'Only the named guarantor may respond to this loan.';
  END IF;

  -- Only the named second guarantor may record a second guarantor response.
  IF (NEW.guarantor2_approved IS DISTINCT FROM OLD.guarantor2_approved
      OR NEW.guarantor2_declined IS DISTINCT FROM OLD.guarantor2_declined
      OR NEW.guarantor2_approved_at IS DISTINCT FROM OLD.guarantor2_approved_at)
     AND (OLD.guarantor2_email IS NULL OR lower(OLD.guarantor2_email) <> v_email) THEN
    RAISE EXCEPTION 'Only the named second guarantor may respond to this loan.';
  END IF;

  -- Approval codes stay owned by their slot's guarantor (or the borrower on submit).
  IF NEW.guarantor_approval_code IS DISTINCT FROM OLD.guarantor_approval_code
     OR NEW.guarantor2_approval_code IS DISTINCT FROM OLD.guarantor2_approval_code THEN
    IF lower(coalesce(OLD.employee_email,'')) <> v_email THEN
      RAISE EXCEPTION 'Approval codes may not be modified.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;