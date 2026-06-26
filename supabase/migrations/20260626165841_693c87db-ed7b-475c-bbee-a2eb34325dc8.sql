
-- 1. EMPLOYEES
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Users can view own employee record" ON public.employees;

CREATE POLICY "employees_select_self" ON public.employees
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "employees_select_admin_finance" ON public.employees
  FOR SELECT USING (
    is_current_user_admin_by_role()
    OR user_has_permission('Finance'::text)
  );

-- 2. VERIFICATION CODE TABLES
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

REVOKE SELECT ON public.email_verification_codes FROM anon, authenticated;
REVOKE SELECT ON public.login_verification_codes FROM anon, authenticated;
REVOKE SELECT ON public.verification_codes FROM anon, authenticated;

DROP POLICY IF EXISTS "Deny client select email_verification_codes" ON public.email_verification_codes;
CREATE POLICY "Deny client select email_verification_codes"
  ON public.email_verification_codes FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "Deny client select login_verification_codes" ON public.login_verification_codes;
CREATE POLICY "Deny client select login_verification_codes"
  ON public.login_verification_codes FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "Deny client select verification_codes" ON public.verification_codes;
CREATE POLICY "Deny client select verification_codes"
  ON public.verification_codes FOR SELECT TO anon, authenticated USING (false);

-- 3. FACE_CREDENTIALS
DROP POLICY IF EXISTS "Admins manage face credentials" ON public.face_credentials;
CREATE POLICY "Admins can delete face credentials"
  ON public.face_credentials FOR DELETE USING (is_current_user_administrator());

-- 4. JOB_APPLICATIONS
DROP POLICY IF EXISTS "Authenticated users can insert job applications" ON public.job_applications;
CREATE POLICY "Authenticated users can insert job applications"
  ON public.job_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid()::text));

DROP POLICY IF EXISTS "Applicants view own job applications" ON public.job_applications;
CREATE POLICY "Applicants view own job applications"
  ON public.job_applications FOR SELECT TO authenticated
  USING (created_by = auth.uid()::text);

-- 5. PROVIDER_SUBMISSION_REQUESTS
DROP POLICY IF EXISTS "Admins and finance can view submissions" ON public.provider_submission_requests;
CREATE POLICY "Admins and finance management can view submissions"
  ON public.provider_submission_requests FOR SELECT
  USING (
    has_role(auth.uid(), 'Super Admin'::app_role)
    OR has_role(auth.uid(), 'Administrator'::app_role)
    OR has_role(auth.uid(), 'finance_manager'::app_role)
  );

-- 6. SALARY_ADVANCE_PAYMENTS
DROP POLICY IF EXISTS "Only finance/admin can insert advance payments" ON public.salary_advance_payments;
CREATE POLICY "Only finance/admin can insert advance payments"
  ON public.salary_advance_payments AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('Finance'::text) OR is_current_user_admin());

-- 7. SYSTEM_MAINTENANCE column-level lockdown
REVOKE SELECT (recovery_key, recovery_pin) ON public.system_maintenance FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_system_maintenance_recovery()
RETURNS TABLE(recovery_key text, recovery_pin text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sm.recovery_key, sm.recovery_pin
  FROM public.system_maintenance sm
  WHERE public.is_super_admin(auth.uid())
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_system_maintenance_recovery() FROM public;
GRANT EXECUTE ON FUNCTION public.get_system_maintenance_recovery() TO authenticated;
