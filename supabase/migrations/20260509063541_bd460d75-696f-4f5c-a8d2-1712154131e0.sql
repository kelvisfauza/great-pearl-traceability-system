-- Allow anon + authenticated to upload weighbridge tickets to dispatch-attachments
DROP POLICY IF EXISTS "Authenticated users can upload dispatch attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anon and auth can upload weighbridge tickets" ON storage.objects;

CREATE POLICY "Anon and auth can upload dispatch attachments"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'dispatch-attachments');
