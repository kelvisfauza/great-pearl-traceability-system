DROP POLICY IF EXISTS "Owners or admins can upload report documents" ON storage.objects;
DROP POLICY IF EXISTS "Owner or admin view report-documents" ON storage.objects;

CREATE POLICY "Staff can upload report documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'report-documents');

CREATE POLICY "Staff can view report documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'report-documents');