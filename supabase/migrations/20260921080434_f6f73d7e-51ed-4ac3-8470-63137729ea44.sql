
CREATE POLICY "Staff can read quotation files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'quotations' AND public.is_active_staff());

CREATE POLICY "Staff can upload quotation files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quotations' AND public.is_active_staff());

CREATE POLICY "Procurement can remove quotation files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'quotations' AND (public.is_procurement_reviewer(auth.uid()) OR public.is_quotation_approver()));
