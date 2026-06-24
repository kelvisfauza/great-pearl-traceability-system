
-- 1) device_sessions: hide verification_token from authenticated
REVOKE SELECT (verification_token) ON public.device_sessions FROM authenticated, anon;

-- 2) Verification code tables: hide plaintext code columns from anon/authenticated
REVOKE SELECT (code) ON public.email_verification_codes FROM authenticated, anon;
REVOKE SELECT (code) ON public.verification_codes FROM authenticated, anon;
REVOKE SELECT (verification_code) ON public.login_verification_codes FROM authenticated, anon;
REVOKE SELECT (verification_code) ON public.withdrawal_verification_codes FROM authenticated, anon;

-- 3) employees: hide most-sensitive PII columns from authenticated reads (service_role still has full access)
REVOKE SELECT (account_number, account_name, national_id_number, tin_number, nssf_number, next_of_kin_phone, emergency_contact)
  ON public.employees FROM authenticated, anon;

-- 4) face_credentials: hide biometric descriptor from authenticated
REVOKE SELECT (descriptor) ON public.face_credentials FROM authenticated, anon;

-- 5) job_applications: restrict UPDATE/DELETE to HR/Admin only
DROP POLICY IF EXISTS "Authenticated users can delete job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Authenticated users can update job applications" ON public.job_applications;

CREATE POLICY "HR or admin update job applications"
  ON public.job_applications FOR UPDATE TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

CREATE POLICY "HR or admin delete job applications"
  ON public.job_applications FOR DELETE TO authenticated
  USING (public.is_hr_or_admin());

-- 6) sent_emails_log: explicitly deny inserts from authenticated (writes only via service role)
DROP POLICY IF EXISTS "Block authenticated inserts on sent_emails_log" ON public.sent_emails_log;
CREATE POLICY "Block authenticated inserts on sent_emails_log"
  ON public.sent_emails_log FOR INSERT TO authenticated
  WITH CHECK (false);

-- 7) support_staff_per_diem: restrict to Finance/Admin
DROP POLICY IF EXISTS "Authenticated can view support staff per-diem" ON public.support_staff_per_diem;
DROP POLICY IF EXISTS "Authenticated can insert support staff per-diem" ON public.support_staff_per_diem;
DROP POLICY IF EXISTS "Authenticated can update support staff per-diem" ON public.support_staff_per_diem;

CREATE POLICY "Finance or admin view support staff per-diem"
  ON public.support_staff_per_diem FOR SELECT TO authenticated
  USING (public.is_current_user_admin() OR public.user_has_permission('Finance'));

CREATE POLICY "Finance or admin insert support staff per-diem"
  ON public.support_staff_per_diem FOR INSERT TO authenticated
  WITH CHECK (public.is_current_user_admin() OR public.user_has_permission('Finance'));

CREATE POLICY "Finance or admin update support staff per-diem"
  ON public.support_staff_per_diem FOR UPDATE TO authenticated
  USING (public.is_current_user_admin() OR public.user_has_permission('Finance'))
  WITH CHECK (public.is_current_user_admin() OR public.user_has_permission('Finance'));

-- 8) system_maintenance: hide recovery_key & recovery_pin from authenticated
REVOKE SELECT (recovery_key, recovery_pin) ON public.system_maintenance FROM authenticated, anon;

-- 9) user_fraud_locks: hide unlock_code from authenticated
REVOKE SELECT (unlock_code) ON public.user_fraud_locks FROM authenticated, anon;
