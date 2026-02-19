-- Update the employees SELECT policy to also allow IT Management users to view all employees
-- This is needed so IT staff can see the employee list when recording attendance

DROP POLICY IF EXISTS "Users view own employee record" ON public.employees;

CREATE POLICY "Users view own employee record" ON public.employees
FOR SELECT USING (
  auth_user_id = auth.uid()
  OR user_has_permission('Human Resources')
  OR user_has_permission('IT Management')
  OR is_current_user_admin()
);