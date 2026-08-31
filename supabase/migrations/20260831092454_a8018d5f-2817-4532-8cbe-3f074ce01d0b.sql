CREATE POLICY "HR and admins can read job application CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'job-applications' AND public.can_manage_employees());