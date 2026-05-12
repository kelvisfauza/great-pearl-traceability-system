
-- 1. SYSTEM SETTINGS: restrict SELECT to admin / Finance / IT
DROP POLICY IF EXISTS "system_settings_read_all_auth" ON public.system_settings;

CREATE POLICY "system_settings_read_admin_finance_it"
ON public.system_settings
FOR SELECT
TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Finance')
  OR user_has_permission('IT Management')
);

-- 2. EMPLOYEES: remove from realtime publication so sensitive column changes
--    aren't broadcast to all subscribers.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'employees'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.employees';
  END IF;
END $$;

-- 3. EMPLOYEES self-update: block changes to privileged columns by the
--    employee themselves (role, permissions, salary, department, disabled,
--    bypass_sms_verification, auth_user_id, email).
CREATE OR REPLACE FUNCTION public.prevent_employee_self_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  is_hr boolean;
BEGIN
  -- Allow service role / no auth context (system jobs)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  is_admin := is_current_user_admin();
  is_hr := user_has_permission('Human Resources');

  -- Admins and HR can change anything
  IF is_admin OR is_hr THEN
    RETURN NEW;
  END IF;

  -- Self-edit only: block protected columns
  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.permissions IS DISTINCT FROM OLD.permissions
     OR NEW.salary IS DISTINCT FROM OLD.salary
     OR NEW.department IS DISTINCT FROM OLD.department
     OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.disabled IS DISTINCT FROM OLD.disabled
     OR NEW.bypass_sms_verification IS DISTINCT FROM OLD.bypass_sms_verification
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.wallet_frozen IS DISTINCT FROM OLD.wallet_frozen
  THEN
    RAISE EXCEPTION 'Not authorized to modify privileged employee fields'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_employee_self_privilege_escalation_trg ON public.employees;
CREATE TRIGGER prevent_employee_self_privilege_escalation_trg
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.prevent_employee_self_privilege_escalation();

-- 4. USER PRESENCE: drop overly permissive SELECT, restrict to self + admin/HR/IT
DROP POLICY IF EXISTS "Authenticated users view user presence" ON public.user_presence;

CREATE POLICY "Users view own presence or admins view all"
ON public.user_presence
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR is_current_user_admin()
  OR user_has_permission('Human Resources')
  OR user_has_permission('IT Management')
);

-- 5. STORAGE report-documents: drop unowned write/delete policies, recreate
--    with path-ownership check (first folder = uploader uid). Admins retain access.
DROP POLICY IF EXISTS "Users can delete their report documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their report documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload report documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete report documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update report documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload report documents" ON storage.objects;

CREATE POLICY "Owners or admins can upload report documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'report-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
  )
);

CREATE POLICY "Owners or admins can update report documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'report-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
  )
)
WITH CHECK (
  bucket_id = 'report-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
  )
);

CREATE POLICY "Owners or admins can delete report documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'report-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
  )
);

-- 6. VERIFICATION AUDIT LOGS: restrict SELECT to admin / IT
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.verification_audit_logs;

CREATE POLICY "Admins and IT can view verification audit logs"
ON public.verification_audit_logs
FOR SELECT
TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('IT Management')
);
