
-- 1) Block non-administrator updates to sensitive employee columns
CREATE OR REPLACE FUNCTION public.prevent_non_admin_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_current_user_administrator() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Only administrators can change the role column on employees'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.permissions IS DISTINCT FROM OLD.permissions THEN
    RAISE EXCEPTION 'Only administrators can change the permissions column on employees'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.disabled IS DISTINCT FROM OLD.disabled THEN
    RAISE EXCEPTION 'Only administrators can change the disabled column on employees'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_non_admin_role_escalation ON public.employees;
CREATE TRIGGER trg_prevent_non_admin_role_escalation
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_non_admin_role_escalation();

-- 2) Hash sms_failures.verification_code so plaintext OTPs are never stored
CREATE OR REPLACE FUNCTION public.hash_sms_failure_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.verification_code IS NOT NULL AND NEW.verification_code <> '' THEN
    -- Only hash if it looks like a plaintext code (bcrypt hashes start with $2)
    IF NEW.verification_code NOT LIKE '$2%' THEN
      NEW.verification_code := crypt(NEW.verification_code, gen_salt('bf', 8));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_sms_failure_code ON public.sms_failures;
CREATE TRIGGER trg_hash_sms_failure_code
  BEFORE INSERT OR UPDATE OF verification_code ON public.sms_failures
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_sms_failure_code();

-- Backfill: hash any existing plaintext codes already in the log
UPDATE public.sms_failures
   SET verification_code = crypt(verification_code, gen_salt('bf', 8))
 WHERE verification_code IS NOT NULL
   AND verification_code <> ''
   AND verification_code NOT LIKE '$2%';
