
-- =============================================================
-- 1. Backfill employees.auth_user_id from auth.users by email
-- =============================================================
UPDATE public.employees e
SET auth_user_id = u.id
FROM auth.users u
WHERE e.auth_user_id IS NULL
  AND e.email IS NOT NULL
  AND lower(e.email) = lower(u.email);

-- =============================================================
-- 2. Drop JWT email fallback from core security helpers
-- =============================================================
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND role = 'Super Admin'
      AND status = 'Active'
      AND COALESCE(disabled, false) = false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_administrator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND role IN ('Administrator', 'Super Admin')
      AND status = 'Active'
      AND COALESCE(disabled, false) = false
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_permission(permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.status = 'Active'
      AND COALESCE(e.disabled, false) = false
      AND (
        e.role = 'Super Admin'
        OR e.permissions @> ARRAY['*']::text[]
        OR e.permissions @> ARRAY[permission_name]::text[]
        OR EXISTS (
          SELECT 1 FROM unnest(e.permissions) AS p
          WHERE p LIKE permission_name || ':%'
        )
      )
  );
$$;

-- =============================================================
-- 3. Trusted helper to resolve the caller's email via auth.uid()
-- =============================================================
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT lower(email)
  FROM public.employees
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- =============================================================
-- 4. Rewrite table policies that compared against auth.jwt() ->> 'email'
-- =============================================================

-- biometric_credentials
DROP POLICY IF EXISTS "Admins can insert own biometric credentials" ON public.biometric_credentials;
DROP POLICY IF EXISTS "Admins can update own biometric credentials" ON public.biometric_credentials;
DROP POLICY IF EXISTS "Admins can view own biometric credentials" ON public.biometric_credentials;
CREATE POLICY "Admins can insert own biometric credentials"
ON public.biometric_credentials FOR INSERT
WITH CHECK (
  lower(email) = public.current_user_email()
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.auth_user_id = auth.uid()
      AND employees.role IN ('Administrator','Super Admin')
  )
);
CREATE POLICY "Admins can update own biometric credentials"
ON public.biometric_credentials FOR UPDATE
USING (
  lower(email) = public.current_user_email()
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.auth_user_id = auth.uid()
      AND employees.role IN ('Administrator','Super Admin')
  )
);
CREATE POLICY "Admins can view own biometric credentials"
ON public.biometric_credentials FOR SELECT
USING (
  lower(email) = public.current_user_email()
  AND EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.auth_user_id = auth.uid()
      AND employees.role IN ('Administrator','Super Admin')
  )
);

-- christmas_vouchers
DROP POLICY IF EXISTS "Admins can delete vouchers" ON public.christmas_vouchers;
DROP POLICY IF EXISTS "Admins can insert vouchers" ON public.christmas_vouchers;
DROP POLICY IF EXISTS "Admins can update vouchers" ON public.christmas_vouchers;
DROP POLICY IF EXISTS "Admins can view all vouchers" ON public.christmas_vouchers;
DROP POLICY IF EXISTS "Users can claim their voucher" ON public.christmas_vouchers;
DROP POLICY IF EXISTS "Users can view their own vouchers" ON public.christmas_vouchers;
CREATE POLICY "Admins can delete vouchers" ON public.christmas_vouchers FOR DELETE
USING (public.is_current_user_administrator());
CREATE POLICY "Admins can insert vouchers" ON public.christmas_vouchers FOR INSERT
WITH CHECK (public.is_current_user_administrator());
CREATE POLICY "Admins can update vouchers" ON public.christmas_vouchers FOR UPDATE
USING (public.is_current_user_administrator())
WITH CHECK (public.is_current_user_administrator());
CREATE POLICY "Admins can view all vouchers" ON public.christmas_vouchers FOR SELECT
USING (public.is_current_user_administrator());
CREATE POLICY "Users can claim their voucher" ON public.christmas_vouchers FOR UPDATE
USING (lower(employee_email) = public.current_user_email())
WITH CHECK (lower(employee_email) = public.current_user_email());
CREATE POLICY "Users can view their own vouchers" ON public.christmas_vouchers FOR SELECT
USING (
  lower(employee_email) = public.current_user_email()
  OR public.is_current_user_administrator()
);

-- employee_contracts: only the SELECT policy uses jwt email — rewrite it
DROP POLICY IF EXISTS "Owner, HR and Admins can view employee_contracts" ON public.employee_contracts;
CREATE POLICY "Owner, HR and Admins can view employee_contracts"
ON public.employee_contracts FOR SELECT
USING (
  public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR lower(employee_email) = public.current_user_email()
);

-- employee_of_the_month
DROP POLICY IF EXISTS "Admins can delete employee of the month" ON public.employee_of_the_month;
DROP POLICY IF EXISTS "Admins can manage employee of the month" ON public.employee_of_the_month;
DROP POLICY IF EXISTS "Admins can update employee of the month" ON public.employee_of_the_month;
CREATE POLICY "Admins can delete employee of the month" ON public.employee_of_the_month FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.role IN ('Super Admin','Manager','Administrator')
  )
);
CREATE POLICY "Admins can manage employee of the month" ON public.employee_of_the_month FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.role IN ('Super Admin','Manager','Administrator')
  )
);
CREATE POLICY "Admins can update employee of the month" ON public.employee_of_the_month FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.role IN ('Super Admin','Manager','Administrator')
  )
);

-- expense_template_refs
DROP POLICY IF EXISTS "Users can insert their own expense template refs" ON public.expense_template_refs;
DROP POLICY IF EXISTS "Users can mark their own expense template refs as used" ON public.expense_template_refs;
CREATE POLICY "Users can insert their own expense template refs"
ON public.expense_template_refs FOR INSERT
WITH CHECK (
  employee_email IS NULL
  OR lower(employee_email) = public.current_user_email()
  OR public.is_current_user_admin()
);
CREATE POLICY "Users can mark their own expense template refs as used"
ON public.expense_template_refs FOR UPDATE
USING (
  employee_email IS NULL
  OR lower(employee_email) = public.current_user_email()
  OR public.is_current_user_admin()
)
WITH CHECK (
  employee_email IS NULL
  OR lower(employee_email) = public.current_user_email()
  OR public.is_current_user_admin()
);

-- monthly_overtime_reviews (SELECT)
DROP POLICY IF EXISTS "Self HR Finance Admin can view overtime reviews" ON public.monthly_overtime_reviews;
CREATE POLICY "Self HR Finance Admin can view overtime reviews"
ON public.monthly_overtime_reviews FOR SELECT
USING (
  lower(employee_email) = public.current_user_email()
  OR public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Finance')
);

-- overtime_awards
DROP POLICY IF EXISTS "Self HR Finance Admin can view overtime awards" ON public.overtime_awards;
DROP POLICY IF EXISTS "Users can update their own overtime awards by email" ON public.overtime_awards;
CREATE POLICY "Self HR Finance Admin can view overtime awards"
ON public.overtime_awards FOR SELECT
USING (
  lower(employee_email) = public.current_user_email()
  OR public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Finance')
);
CREATE POLICY "Users can update their own overtime awards by email"
ON public.overtime_awards FOR UPDATE
USING (lower(employee_email) = public.current_user_email())
WITH CHECK (lower(employee_email) = public.current_user_email());

-- per_diem_awards (SELECT)
DROP POLICY IF EXISTS "Self HR Finance Admin can view per diem awards" ON public.per_diem_awards;
CREATE POLICY "Self HR Finance Admin can view per diem awards"
ON public.per_diem_awards FOR SELECT
USING (
  lower(employee_email) = public.current_user_email()
  OR public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Finance')
);

-- time_deductions (SELECT)
DROP POLICY IF EXISTS "Self HR Finance Admin can view time_deductions" ON public.time_deductions;
CREATE POLICY "Self HR Finance Admin can view time_deductions"
ON public.time_deductions FOR SELECT
USING (
  lower(employee_email) = public.current_user_email()
  OR public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Finance')
);

-- system_settings
DROP POLICY IF EXISTS "system_settings_admin_write" ON public.system_settings;
CREATE POLICY "system_settings_admin_write" ON public.system_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND (
        e.role IN ('Administrator','Admin','admin')
        OR e.department IN ('Administration','Finance')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND (
        e.role IN ('Administrator','Admin','admin')
        OR e.department IN ('Administration','Finance')
      )
  )
);

-- =============================================================
-- 5. Hashing triggers for plaintext credentials
-- =============================================================

-- email_verification_codes
CREATE OR REPLACE FUNCTION public.hash_email_verification_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.code IS NOT NULL AND NEW.code !~ '^\$2[aby]\$' THEN
    NEW.code := extensions.crypt(NEW.code, extensions.gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_hash_email_verification_code ON public.email_verification_codes;
CREATE TRIGGER trg_hash_email_verification_code
BEFORE INSERT OR UPDATE OF code ON public.email_verification_codes
FOR EACH ROW EXECUTE FUNCTION public.hash_email_verification_code();

-- verification_codes (2FA SMS)
CREATE OR REPLACE FUNCTION public.hash_2fa_verification_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.code IS NOT NULL AND NEW.code !~ '^\$2[aby]\$' THEN
    NEW.code := extensions.crypt(NEW.code, extensions.gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_hash_2fa_verification_code ON public.verification_codes;
CREATE TRIGGER trg_hash_2fa_verification_code
BEFORE INSERT OR UPDATE OF code ON public.verification_codes
FOR EACH ROW EXECUTE FUNCTION public.hash_2fa_verification_code();

-- admin_initiated_withdrawals
CREATE OR REPLACE FUNCTION public.hash_admin_withdrawal_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.pin_code IS NOT NULL AND NEW.pin_code !~ '^\$2[aby]\$' THEN
    NEW.pin_code := extensions.crypt(NEW.pin_code, extensions.gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_hash_admin_withdrawal_pin ON public.admin_initiated_withdrawals;
CREATE TRIGGER trg_hash_admin_withdrawal_pin
BEFORE INSERT OR UPDATE OF pin_code ON public.admin_initiated_withdrawals
FOR EACH ROW EXECUTE FUNCTION public.hash_admin_withdrawal_pin();

-- system_maintenance recovery_key & recovery_pin
CREATE OR REPLACE FUNCTION public.hash_system_maintenance_recovery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.recovery_key IS NOT NULL AND NEW.recovery_key !~ '^\$2[aby]\$' THEN
    NEW.recovery_key := extensions.crypt(NEW.recovery_key, extensions.gen_salt('bf', 10));
  END IF;
  IF NEW.recovery_pin IS NOT NULL AND NEW.recovery_pin !~ '^\$2[aby]\$' THEN
    NEW.recovery_pin := extensions.crypt(NEW.recovery_pin, extensions.gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_hash_system_maintenance_recovery ON public.system_maintenance;
CREATE TRIGGER trg_hash_system_maintenance_recovery
BEFORE INSERT OR UPDATE OF recovery_key, recovery_pin ON public.system_maintenance
FOR EACH ROW EXECUTE FUNCTION public.hash_system_maintenance_recovery();

-- =============================================================
-- 6. Expire any pending plaintext OTPs so users get a fresh hashed one
--    (verify RPCs use crypt() and won't match plaintext correctly).
-- =============================================================
UPDATE public.email_verification_codes
SET expires_at = now() - interval '1 second'
WHERE expires_at > now()
  AND code IS NOT NULL
  AND code !~ '^\$2[aby]\$';

UPDATE public.verification_codes
SET expires_at = now() - interval '1 second'
WHERE expires_at > now()
  AND code IS NOT NULL
  AND code !~ '^\$2[aby]\$';

-- Hash any lingering plaintext recovery credentials in system_maintenance
-- (verify_and_deactivate_maintenance already handles both forms, but we
-- want the at-rest value to always be a hash going forward).
UPDATE public.system_maintenance
SET recovery_key = extensions.crypt(recovery_key, extensions.gen_salt('bf', 10))
WHERE recovery_key IS NOT NULL AND recovery_key !~ '^\$2[aby]\$';

UPDATE public.system_maintenance
SET recovery_pin = extensions.crypt(recovery_pin, extensions.gen_salt('bf', 10))
WHERE recovery_pin IS NOT NULL AND recovery_pin !~ '^\$2[aby]\$';
