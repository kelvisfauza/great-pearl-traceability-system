UPDATE storage.buckets SET public = true WHERE id = 'loan-documents';

CREATE POLICY "Anon can upload loan docs" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'loan-documents');
CREATE POLICY "Anon can read loan docs" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'loan-documents');