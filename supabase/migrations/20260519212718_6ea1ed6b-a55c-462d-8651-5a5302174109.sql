
-- =========================================================
-- 1. EMPLOYEES: prevent self-escalation of privileged fields
-- =========================================================
CREATE OR REPLACE FUNCTION public.prevent_employee_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_priv boolean;
BEGIN
  -- Admins / HR / User-Management can change anything
  is_priv := COALESCE(public.is_current_user_admin(), false)
          OR COALESCE(public.is_current_user_administrator(), false)
          OR COALESCE(public.user_has_permission('Human Resources'), false)
          OR COALESCE(public.user_has_permission('Human Resources:edit'), false)
          OR COALESCE(public.user_has_permission('User Management:edit'), false)
          OR COALESCE(public.can_manage_users(), false);

  IF is_priv THEN
    RETURN NEW;
  END IF;

  -- Non-privileged users must not change these columns
  IF NEW.role            IS DISTINCT FROM OLD.role            THEN RAISE EXCEPTION 'Not allowed to change role'; END IF;
  IF NEW.permissions     IS DISTINCT FROM OLD.permissions     THEN RAISE EXCEPTION 'Not allowed to change permissions'; END IF;
  IF NEW.status          IS DISTINCT FROM OLD.status          THEN RAISE EXCEPTION 'Not allowed to change status'; END IF;
  IF NEW.disabled        IS DISTINCT FROM OLD.disabled        THEN RAISE EXCEPTION 'Not allowed to change disabled flag'; END IF;
  IF NEW.salary          IS DISTINCT FROM OLD.salary          THEN RAISE EXCEPTION 'Not allowed to change salary'; END IF;
  IF NEW.department      IS DISTINCT FROM OLD.department      THEN RAISE EXCEPTION 'Not allowed to change department'; END IF;
  IF NEW.position        IS DISTINCT FROM OLD.position        THEN RAISE EXCEPTION 'Not allowed to change position'; END IF;
  IF NEW.employee_id     IS DISTINCT FROM OLD.employee_id     THEN RAISE EXCEPTION 'Not allowed to change employee id'; END IF;
  IF NEW.email           IS DISTINCT FROM OLD.email           THEN RAISE EXCEPTION 'Not allowed to change email'; END IF;
  IF NEW.auth_user_id    IS DISTINCT FROM OLD.auth_user_id    THEN RAISE EXCEPTION 'Not allowed to change auth_user_id'; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_employee_privilege_escalation ON public.employees;
CREATE TRIGGER trg_prevent_employee_privilege_escalation
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.prevent_employee_privilege_escalation();

-- =========================================================
-- 2. SMS_FAILURES: never persist plaintext OTPs
-- =========================================================
CREATE OR REPLACE FUNCTION public.mask_sms_failure_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.verification_code IS NOT NULL AND length(NEW.verification_code) > 0 THEN
    -- Keep only the first 2 chars, mask the rest. Length is capped to avoid storing length info.
    NEW.verification_code := substr(NEW.verification_code, 1, 2) || '****';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mask_sms_failure_code ON public.sms_failures;
CREATE TRIGGER trg_mask_sms_failure_code
BEFORE INSERT OR UPDATE ON public.sms_failures
FOR EACH ROW
EXECUTE FUNCTION public.mask_sms_failure_code();

-- Mask any existing rows
UPDATE public.sms_failures
SET verification_code = substr(verification_code, 1, 2) || '****'
WHERE verification_code IS NOT NULL
  AND length(verification_code) > 0
  AND verification_code NOT LIKE '%****';

-- =========================================================
-- 3. VERIFICATIONS: restrict read access (was USING true)
-- =========================================================
DROP POLICY IF EXISTS "Authenticated can view verifications" ON public.verifications;

CREATE POLICY "Admins, HR and owner can view verifications"
ON public.verifications
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_current_user_admin()
  OR public.is_current_user_administrator()
  OR public.user_has_permission('Human Resources:view')
  OR public.user_has_permission('User Management:view')
);

-- =========================================================
-- 4. WITHDRAWAL_VERIFICATION_CODES: hash OTP + restrict reads
-- =========================================================
CREATE OR REPLACE FUNCTION public.hash_withdrawal_verification_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.verification_code IS NOT NULL AND length(NEW.verification_code) > 0
     -- already hashed (bcrypt hashes start with $2)
     AND NEW.verification_code NOT LIKE '$2%' THEN
    NEW.verification_code := extensions.crypt(NEW.verification_code, extensions.gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_withdrawal_verification_code ON public.withdrawal_verification_codes;
CREATE TRIGGER trg_hash_withdrawal_verification_code
BEFORE INSERT OR UPDATE OF verification_code ON public.withdrawal_verification_codes
FOR EACH ROW
EXECUTE FUNCTION public.hash_withdrawal_verification_code();

-- Update verifier RPC to compare hashes via crypt()
CREATE OR REPLACE FUNCTION public.verify_withdrawal_code(p_code_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $$
DECLARE
  v_record RECORD;
  v_valid boolean;
  v_attempts_remaining integer;
BEGIN
  SELECT * INTO v_record FROM public.withdrawal_verification_codes WHERE id = p_code_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Code not found'); END IF;
  IF v_record.verified THEN RETURN jsonb_build_object('success', false, 'error', 'Code already used'); END IF;
  IF v_record.attempts >= v_record.max_attempts THEN RETURN jsonb_build_object('success', false, 'error', 'Maximum attempts exceeded'); END IF;
  IF v_record.code_expires_at < now() THEN RETURN jsonb_build_object('success', false, 'error', 'Code expired'); END IF;

  UPDATE public.withdrawal_verification_codes SET attempts = attempts + 1 WHERE id = p_code_id;

  -- Hashed compare (bcrypt). Falls back to equality if legacy plaintext is still present.
  IF v_record.verification_code LIKE '$2%' THEN
    v_valid := extensions.crypt(p_code, v_record.verification_code) = v_record.verification_code;
  ELSE
    v_valid := v_record.verification_code = p_code;
  END IF;

  IF v_valid THEN
    UPDATE public.withdrawal_verification_codes SET verified = true, verified_at = now() WHERE id = p_code_id;
    INSERT INTO public.withdrawal_approval_logs (withdrawal_request_id, approver_email, action, verification_method)
    VALUES (v_record.withdrawal_request_id, v_record.approver_email, 'verification_success', 'sms');
    RETURN jsonb_build_object('success', true);
  ELSE
    v_attempts_remaining := v_record.max_attempts - (v_record.attempts + 1);
    INSERT INTO public.withdrawal_approval_logs (withdrawal_request_id, approver_email, action, verification_method, details)
    VALUES (v_record.withdrawal_request_id, v_record.approver_email, 'verification_failed', 'sms',
            jsonb_build_object('attempts', v_record.attempts + 1));
    RETURN jsonb_build_object('success', false, 'error', 'Invalid code', 'attempts_remaining', v_attempts_remaining);
  END IF;
END;
$$;

-- Hash any existing plaintext rows that are still unused & unexpired
UPDATE public.withdrawal_verification_codes
SET verification_code = extensions.crypt(verification_code, extensions.gen_salt('bf'))
WHERE verification_code IS NOT NULL
  AND verification_code NOT LIKE '$2%'
  AND verified = false
  AND code_expires_at > now();

-- Restrict direct row reads to admins only (the RPC bypasses RLS via SECURITY DEFINER)
DROP POLICY IF EXISTS "Approvers can view own verification codes" ON public.withdrawal_verification_codes;

CREATE POLICY "Only admins can view withdrawal verification codes"
ON public.withdrawal_verification_codes
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());
