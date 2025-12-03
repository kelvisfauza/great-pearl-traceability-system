-- Update the employees SELECT policy to allow IT Management to view all employees
DROP POLICY IF EXISTS "Users view own employee record" ON public.employees;

CREATE POLICY "Users view own employee record" ON public.employees
FOR SELECT
USING (
  (auth_user_id = auth.uid()) OR 
  user_has_permission('Human Resources'::text) OR 
  user_has_permission('IT Management'::text) OR
  is_current_user_admin()
);