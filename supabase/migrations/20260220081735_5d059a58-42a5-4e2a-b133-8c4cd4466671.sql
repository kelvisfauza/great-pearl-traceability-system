-- Allow employees to update their own bank details
CREATE POLICY "Employees can update own bank details"
ON public.employees
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());