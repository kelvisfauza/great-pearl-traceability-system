-- 1. Fix mutable search_path
ALTER FUNCTION public._grn_code_alphabet() SET search_path = public;

-- 2. Contract documents: restrict read to authorized staff
DROP POLICY IF EXISTS "Authenticated users can read contract docs" ON storage.objects;
CREATE POLICY "Authorized staff can read contract docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND (
    public.is_current_user_admin()
    OR public.user_has_permission('Sales Marketing')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('Finance Management')
  )
);

-- 3. Sales documents: restrict read to sales/finance/admin
DROP POLICY IF EXISTS "Authenticated users can view sales documents" ON storage.objects;
CREATE POLICY "Sales staff can view sales documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'sales-documents'
  AND (
    public.is_current_user_admin()
    OR public.user_has_permission('Sales Marketing')
    OR public.user_has_permission('Finance Management')
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND ('Sales & Marketing' = ANY (e.permissions)
             OR e.role = ANY (ARRAY['Administrator','Super Admin']))
    )
  )
);

-- 4. Profile pictures: scope reads to own folder or staff avatar folders
DROP POLICY IF EXISTS "Authenticated users can view profile pictures" ON storage.objects;
CREATE POLICY "Staff can view employee profile pictures"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'profile_pictures'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE (e.auth_user_id)::text = (storage.foldername(name))[1]
    )
  )
);

-- 5. quality_manager_approvals: only quality managers / admins may insert
DROP POLICY IF EXISTS "Staff can log quality manager approvals" ON public.quality_manager_approvals;
CREATE POLICY "Quality managers and admins can log approvals"
ON public.quality_manager_approvals FOR INSERT TO authenticated
WITH CHECK (
  public.is_current_user_admin()
  OR public.can_manage_quality_assessments()
);