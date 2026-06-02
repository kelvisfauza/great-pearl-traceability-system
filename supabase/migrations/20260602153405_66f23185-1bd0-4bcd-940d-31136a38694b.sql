DROP POLICY IF EXISTS "Users can upload dispatch attachments to own folder" ON storage.objects;

CREATE POLICY "Authenticated users can upload dispatch attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'dispatch-attachments');

CREATE POLICY "Authenticated users can update dispatch attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'dispatch-attachments');