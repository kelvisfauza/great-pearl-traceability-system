DROP POLICY IF EXISTS "Host can upload own call recordings" ON storage.objects;
CREATE POLICY "Host can upload own call recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'call-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Host can update own call recordings" ON storage.objects;
CREATE POLICY "Host can update own call recordings"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'call-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Host or admin can delete call recordings" ON storage.objects;
CREATE POLICY "Host or admin can delete call recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'call-recordings'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_current_user_admin()
  )
);