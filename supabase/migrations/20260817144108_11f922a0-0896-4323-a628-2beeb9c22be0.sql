DROP POLICY IF EXISTS "Authenticated can view dispatch attachments" ON storage.objects;
CREATE POLICY "Store/Logistics/Admin can view dispatch attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'dispatch-attachments'
  AND (
    public.is_current_user_admin()
    OR public.user_has_permission('Store Management')
    OR public.user_has_permission('Logistics')
  )
);

DROP POLICY IF EXISTS "Staff can view quality analysis files" ON storage.objects;
CREATE POLICY "Owners or quality staff can view quality analysis files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'quality-analysis-files'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.is_quality_or_admin()
    OR public.is_current_user_admin()
  )
);

DROP POLICY IF EXISTS "Staff can view report documents" ON storage.objects;
CREATE POLICY "Owners or managers can view report documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'report-documents'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.user_has_permission('Finance Management')
    OR public.user_has_permission('Operations')
    OR public.is_current_user_admin()
  )
);

DROP POLICY IF EXISTS "Staff can view milling remittances" ON public.milling_collection_remittances;
CREATE POLICY "Milling and finance staff can view milling remittances"
ON public.milling_collection_remittances FOR SELECT TO authenticated
USING (
  public.user_has_milling_access()
  OR public.user_has_permission('Finance Management')
  OR public.is_current_user_admin()
);