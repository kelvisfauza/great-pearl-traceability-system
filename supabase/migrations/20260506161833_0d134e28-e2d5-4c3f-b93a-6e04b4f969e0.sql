
-- 1. Job applications storage: remove public read, allow only HR/Admin authenticated users
DROP POLICY IF EXISTS "Anyone can view CVs" ON storage.objects;
CREATE POLICY "HR and admins can view CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-applications'
  AND (public.user_has_permission('Human Resources') OR public.is_current_user_admin())
);

-- 2. Contracts storage: remove public read, restrict to authenticated Sales/Procurement/Finance/Admin
DROP POLICY IF EXISTS "Anyone can view contract files" ON storage.objects;
CREATE POLICY "Authorized staff can view contract files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contracts'
  AND (
    public.is_current_user_admin()
    OR public.user_has_permission('Sales Marketing')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('Finance Management')
  )
);

-- Also tighten contracts upload/update to authenticated role
DROP POLICY IF EXISTS "Authenticated users can upload contract files" ON storage.objects;
CREATE POLICY "Authenticated users can upload contract files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contracts');

DROP POLICY IF EXISTS "Authenticated users can update contract files" ON storage.objects;
CREATE POLICY "Authenticated users can update contract files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contracts');

-- 3. system_maintenance: remove anonymous deactivation policy
DROP POLICY IF EXISTS "Anyone can deactivate maintenance" ON public.system_maintenance;

-- 4. employees: remove the broad same-department peer read policy (PII exposure)
DROP POLICY IF EXISTS "Users can view same department employees" ON public.employees;

-- 5. announcements: restrict DELETE to creator, HR, or admin
DROP POLICY IF EXISTS "Authenticated users can delete announcements" ON public.announcements;
CREATE POLICY "Creators HR and admins can delete announcements"
ON public.announcements FOR DELETE
TO authenticated
USING (
  public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR created_by = (SELECT email FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- 6. finance_coffee_lots: drop public read; restrict to Finance/Admin
DROP POLICY IF EXISTS "Anyone can view finance_coffee_lots" ON public.finance_coffee_lots;
CREATE POLICY "Finance and admins can view finance_coffee_lots"
ON public.finance_coffee_lots FOR SELECT
TO authenticated
USING (public.user_has_permission('Finance Management') OR public.is_current_user_admin());

-- 7. sms_failures: narrow read access to administrators only (remove broad IT Management read)
DROP POLICY IF EXISTS "Admins/IT can view sms failures" ON public.sms_failures;
CREATE POLICY "Only admins can view sms failures"
ON public.sms_failures FOR SELECT
TO authenticated
USING (public.is_current_user_admin());
