ALTER TABLE public.store_clearance_forms
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE POLICY "Authenticated can view clearance form scans"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'dispatch-attachments' AND (storage.foldername(name))[1] = 'clearance-forms');

CREATE POLICY "Authenticated can upload clearance form scans"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'dispatch-attachments' AND (storage.foldername(name))[1] = 'clearance-forms');

CREATE POLICY "Authenticated can update clearance form scans"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'dispatch-attachments' AND (storage.foldername(name))[1] = 'clearance-forms')
WITH CHECK (bucket_id = 'dispatch-attachments' AND (storage.foldername(name))[1] = 'clearance-forms');

CREATE POLICY "Authenticated can delete clearance form scans"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'dispatch-attachments' AND (storage.foldername(name))[1] = 'clearance-forms');