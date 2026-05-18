CREATE POLICY "Users can read own statements"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'statements'
  AND (auth.uid()::text = (storage.foldername(name))[1])
);