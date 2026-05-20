-- ============================================================
-- 1) sms_failures: mask OTPs on insert (function already exists)
-- ============================================================
DROP TRIGGER IF EXISTS trg_mask_sms_failure_code ON public.sms_failures;
CREATE TRIGGER trg_mask_sms_failure_code
BEFORE INSERT OR UPDATE OF verification_code ON public.sms_failures
FOR EACH ROW EXECUTE FUNCTION public.mask_sms_failure_code();

-- Mask any pre-existing plaintext rows
UPDATE public.sms_failures
SET verification_code = substr(verification_code, 1, 2) || '****'
WHERE verification_code IS NOT NULL
  AND length(verification_code) > 0
  AND verification_code NOT LIKE '%****';

-- ============================================================
-- 2) withdrawal_verification_codes: bcrypt-hash on insert
-- ============================================================
-- Harden the existing trigger function with explicit search_path
CREATE OR REPLACE FUNCTION public.trg_hash_withdrawal_verification_codes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.verification_code IS NOT NULL AND NEW.verification_code !~ '^\$2[aby]\$' THEN
    NEW.verification_code := extensions.crypt(NEW.verification_code, extensions.gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_withdrawal_verification_codes_biu ON public.withdrawal_verification_codes;
CREATE TRIGGER trg_hash_withdrawal_verification_codes_biu
BEFORE INSERT OR UPDATE OF verification_code ON public.withdrawal_verification_codes
FOR EACH ROW EXECUTE FUNCTION public.trg_hash_withdrawal_verification_codes();

-- Hash any existing plaintext rows (skip already-hashed values)
UPDATE public.withdrawal_verification_codes
SET verification_code = extensions.crypt(verification_code, extensions.gen_salt('bf'))
WHERE verification_code IS NOT NULL
  AND verification_code !~ '^\$2[aby]\$';

-- ============================================================
-- 3) employees: block privilege escalation via self-update
-- ============================================================
-- Trigger blocks non-admin / non-HR users from changing sensitive columns
-- on their own employee row. The self-update RLS policy stays so users can
-- still edit their own bank details.
CREATE OR REPLACE FUNCTION public.prevent_employee_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_privileged boolean := false;
BEGIN
  -- Service-role / superuser updates (e.g. SECURITY DEFINER admin RPCs) bypass this check
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_is_privileged := public.is_current_user_admin()
                       OR public.user_has_permission('Human Resources')
                       OR public.user_has_permission('Human Resources:edit')
                       OR public.user_has_permission('User Management:edit');
  EXCEPTION WHEN OTHERS THEN
    v_is_privileged := false;
  END;

  IF v_is_privileged THEN
    RETURN NEW;
  END IF;

  -- Non-privileged users: lock down sensitive columns to OLD values.
  NEW.role                    := OLD.role;
  NEW.permissions             := OLD.permissions;
  NEW.salary                  := OLD.salary;
  NEW.disabled                := OLD.disabled;
  NEW.disabled_reason         := OLD.disabled_reason;
  NEW.disabled_at             := OLD.disabled_at;
  NEW.auth_user_id            := OLD.auth_user_id;
  NEW.email                   := OLD.email;
  NEW.employee_id             := OLD.employee_id;
  NEW.status                  := OLD.status;
  NEW.department              := OLD.department;
  NEW.position                := OLD.position;
  NEW.bypass_sms_verification := OLD.bypass_sms_verification;
  NEW.wallet_frozen           := OLD.wallet_frozen;
  NEW.wallet_frozen_at        := OLD.wallet_frozen_at;
  NEW.wallet_frozen_by        := OLD.wallet_frozen_by;
  NEW.wallet_frozen_reason    := OLD.wallet_frozen_reason;
  NEW.is_training_account     := OLD.is_training_account;
  NEW.last_notified_role      := OLD.last_notified_role;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_employee_self_escalation ON public.employees;
CREATE TRIGGER trg_prevent_employee_self_escalation
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.prevent_employee_self_escalation();

-- ============================================================
-- 4) employees_select_policy: drop unverified JWT email branch
-- ============================================================
DROP POLICY IF EXISTS employees_select_policy ON public.employees;
CREATE POLICY employees_select_policy
ON public.employees
FOR SELECT
USING (
  auth_user_id = auth.uid()
  OR public.is_current_user_administrator()
  OR public.user_has_permission('Human Resources:view')
  OR public.user_has_permission('User Management:view')
);

-- ============================================================
-- 5) verifications: restrict UPDATE policy and protect identity columns
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can update verifications" ON public.verifications;
CREATE POLICY "Owners, HR and admins can update verifications"
ON public.verifications
FOR UPDATE
USING (
  created_by = auth.uid()
  OR public.is_current_user_admin()
  OR public.user_has_permission('Human Resources:edit')
)
WITH CHECK (
  created_by = auth.uid()
  OR public.is_current_user_admin()
  OR public.user_has_permission('Human Resources:edit')
);

-- Trigger: never allow created_by or access_pin_hash to be silently overwritten
CREATE OR REPLACE FUNCTION public.protect_verification_identity_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- created_by is immutable once set
  IF OLD.created_by IS NOT NULL AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    NEW.created_by := OLD.created_by;
  END IF;

  -- Only admins / HR-edit may rotate the access_pin_hash; everyone else keeps OLD
  IF NEW.access_pin_hash IS DISTINCT FROM OLD.access_pin_hash THEN
    IF NOT (public.is_current_user_admin()
            OR public.user_has_permission('Human Resources:edit')) THEN
      NEW.access_pin_hash := OLD.access_pin_hash;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_verification_identity_columns ON public.verifications;
CREATE TRIGGER trg_protect_verification_identity_columns
BEFORE UPDATE ON public.verifications
FOR EACH ROW EXECUTE FUNCTION public.protect_verification_identity_columns();

-- ============================================================
-- 6) public_holidays: restrict writes to HR / admins
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert holidays" ON public.public_holidays;
DROP POLICY IF EXISTS "Admins can update holidays" ON public.public_holidays;
DROP POLICY IF EXISTS "Admins can delete holidays" ON public.public_holidays;

CREATE POLICY "HR and admins can insert holidays"
ON public.public_holidays
FOR INSERT
WITH CHECK (
  public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Human Resources:edit')
);

CREATE POLICY "HR and admins can update holidays"
ON public.public_holidays
FOR UPDATE
USING (
  public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Human Resources:edit')
)
WITH CHECK (
  public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Human Resources:edit')
);

CREATE POLICY "HR and admins can delete holidays"
ON public.public_holidays
FOR DELETE
USING (
  public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Human Resources:edit')
);