DROP POLICY IF EXISTS "Admins or self view employee of the month" ON public.employee_of_the_month;
CREATE POLICY "All staff can view active employee of the month"
ON public.employee_of_the_month
FOR SELECT
TO authenticated
USING (is_active = true OR is_current_user_admin_by_role() OR (employee_email = ((SELECT users.email FROM auth.users WHERE users.id = auth.uid()))::text));