CREATE POLICY "Admins can read daily reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'daily-reports' AND public.can_manage_users());