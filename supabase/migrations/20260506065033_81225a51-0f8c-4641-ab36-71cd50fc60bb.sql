
-- ============ employee_contracts ============
DROP POLICY IF EXISTS "Allow all access to employee_contracts" ON public.employee_contracts;

CREATE POLICY "Owner, HR and Admins can view employee_contracts"
ON public.employee_contracts FOR SELECT TO authenticated
USING (
  public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR employee_email = (auth.jwt() ->> 'email')
);

CREATE POLICY "HR and Admins can insert employee_contracts"
ON public.employee_contracts FOR INSERT TO authenticated
WITH CHECK (public.is_current_user_admin() OR public.user_has_permission('Human Resources'));

CREATE POLICY "HR and Admins can update employee_contracts"
ON public.employee_contracts FOR UPDATE TO authenticated
USING (public.is_current_user_admin() OR public.user_has_permission('Human Resources'))
WITH CHECK (public.is_current_user_admin() OR public.user_has_permission('Human Resources'));

CREATE POLICY "Admins can delete employee_contracts"
ON public.employee_contracts FOR DELETE TO authenticated
USING (public.is_current_user_admin());

-- ============ location_tracking_logs ============
DROP POLICY IF EXISTS "Authenticated users can view all location logs" ON public.location_tracking_logs;
CREATE POLICY "Self HR Admin can view location logs"
ON public.location_tracking_logs FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('IT')
);

-- ============ user_session_logs ============
DROP POLICY IF EXISTS "Authenticated users can view session logs" ON public.user_session_logs;
CREATE POLICY "Self HR Admin IT can view session logs"
ON public.user_session_logs FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('IT')
);

-- ============ time_deductions ============
DROP POLICY IF EXISTS "Authenticated users can view time deductions" ON public.time_deductions;
CREATE POLICY "Self HR Finance Admin can view time_deductions"
ON public.time_deductions FOR SELECT TO authenticated
USING (
  employee_email = (auth.jwt() ->> 'email')
  OR public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Finance')
);

-- ============ monthly_overtime_reviews ============
DROP POLICY IF EXISTS "Authenticated users can view overtime reviews" ON public.monthly_overtime_reviews;
CREATE POLICY "Self HR Finance Admin can view overtime reviews"
ON public.monthly_overtime_reviews FOR SELECT TO authenticated
USING (
  employee_email = (auth.jwt() ->> 'email')
  OR public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Finance')
);

-- ============ overtime_awards ============
DROP POLICY IF EXISTS "Anyone authenticated can view overtime awards" ON public.overtime_awards;
CREATE POLICY "Self HR Finance Admin can view overtime awards"
ON public.overtime_awards FOR SELECT TO authenticated
USING (
  employee_email = (auth.jwt() ->> 'email')
  OR public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Finance')
);

-- ============ per_diem_awards ============
DROP POLICY IF EXISTS "Authenticated users can view per diem awards" ON public.per_diem_awards;
CREATE POLICY "Self HR Finance Admin can view per diem awards"
ON public.per_diem_awards FOR SELECT TO authenticated
USING (
  employee_email = (auth.jwt() ->> 'email')
  OR public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Finance')
);

-- ============ sent_emails_log ============
DROP POLICY IF EXISTS "IT admins can view sent emails" ON public.sent_emails_log;
CREATE POLICY "IT and Admins can view sent emails"
ON public.sent_emails_log FOR SELECT TO authenticated
USING (
  public.is_current_user_admin()
  OR public.user_has_permission('IT')
);

-- ============ system_maintenance ============
DROP POLICY IF EXISTS "Anyone can read maintenance status" ON public.system_maintenance;
CREATE POLICY "Authenticated can read maintenance status"
ON public.system_maintenance FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.get_maintenance_status()
RETURNS TABLE(is_active boolean, reason text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_active, reason FROM public.system_maintenance LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_maintenance_status() TO anon, authenticated;

-- ============ suppliers ============
DROP POLICY IF EXISTS "Public can view suppliers for display" ON public.suppliers;

CREATE OR REPLACE FUNCTION public.get_public_supplier_count()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.suppliers;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_supplier_count() TO anon, authenticated;

-- ============ verifications ============
DROP POLICY IF EXISTS "Anyone can view verifications by code" ON public.verifications;
CREATE POLICY "Authenticated can view verifications"
ON public.verifications FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.verify_by_code(_code text)
RETURNS TABLE(
  id uuid, code text, type text, subtype text, status text,
  issued_to_name text, employee_no text, "position" text,
  department text, workstation text, issued_at timestamptz,
  valid_until timestamptz, reference_no text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, code, type, subtype, status, issued_to_name, employee_no,
         "position", department, workstation, issued_at, valid_until, reference_no
  FROM public.verifications
  WHERE code = upper(trim(_code))
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.verify_by_code(text) TO anon, authenticated;

-- ============ Storage buckets ============
DROP POLICY IF EXISTS "Anon can read loan docs" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload loan docs" ON storage.objects;
DROP POLICY IF EXISTS "Public read for statements" ON storage.objects;
