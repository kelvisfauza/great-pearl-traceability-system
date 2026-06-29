
DROP POLICY IF EXISTS "Authenticated users can insert job applications" ON public.job_applications;

CREATE POLICY "HR or admin can insert job applications"
ON public.job_applications
FOR INSERT
TO authenticated
WITH CHECK (is_hr_or_admin());
