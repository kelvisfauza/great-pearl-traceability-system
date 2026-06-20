
DROP POLICY IF EXISTS "Anyone can view dispatch attachments" ON storage.objects;
CREATE POLICY "Authenticated can view dispatch attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dispatch-attachments' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view price approval requests" ON public.price_approval_requests;
CREATE POLICY "Pricing roles can view price approval requests"
  ON public.price_approval_requests FOR SELECT TO authenticated
  USING (
    is_current_user_admin()
    OR user_has_permission('Procurement')
    OR user_has_permission('Finance')
    OR user_has_permission('Finance Management')
  );

DROP POLICY IF EXISTS "Authenticated users can view quick analyses" ON public.quick_analyses;
CREATE POLICY "Quality and pricing roles can view quick analyses"
  ON public.quick_analyses FOR SELECT TO authenticated
  USING (
    is_current_user_admin()
    OR user_has_permission('Quality Control')
    OR user_has_permission('Quality')
    OR user_has_permission('Procurement')
    OR user_has_permission('Finance')
    OR user_has_permission('Finance Management')
  );

DROP POLICY IF EXISTS "Users can view all risk assessments" ON public.risk_assessments;
CREATE POLICY "Admins and management can view risk assessments"
  ON public.risk_assessments FOR SELECT TO authenticated
  USING (
    is_current_user_admin()
    OR user_has_permission('Management')
    OR user_has_permission('Finance Management')
  );

DROP POLICY IF EXISTS "Allow authenticated users to view supplier subcontracts" ON public.supplier_subcontracts;
CREATE POLICY "Procurement Finance Sales Admin view supplier subcontracts"
  ON public.supplier_subcontracts FOR SELECT TO authenticated
  USING (
    is_current_user_admin()
    OR user_has_permission('Procurement')
    OR user_has_permission('Finance')
    OR user_has_permission('Finance Management')
    OR user_has_permission('Sales Marketing')
    OR user_has_permission('Sales')
  );
