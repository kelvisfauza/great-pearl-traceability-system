DROP POLICY IF EXISTS "Staff can view employee profile pictures" ON storage.objects;
CREATE POLICY "Signed-in staff can view profile pictures"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'profile_pictures');