
CREATE POLICY "Users upload own budget receipts" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'budget-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own budget receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'budget-receipts' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'Administrator'::app_role) OR public.has_role(auth.uid(),'Super Admin'::app_role)));
CREATE POLICY "Admins manage budget receipts" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'budget-receipts' AND (public.has_role(auth.uid(),'Administrator'::app_role) OR public.has_role(auth.uid(),'Super Admin'::app_role)))
  WITH CHECK (bucket_id = 'budget-receipts' AND (public.has_role(auth.uid(),'Administrator'::app_role) OR public.has_role(auth.uid(),'Super Admin'::app_role)));
