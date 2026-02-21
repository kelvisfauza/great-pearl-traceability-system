
-- Allow IT Management users to view and manage company employees
DROP POLICY IF EXISTS "HR can manage company_employees" ON public.company_employees;

CREATE POLICY "HR and IT can manage company_employees"
ON public.company_employees
FOR ALL
TO authenticated
USING (
  user_has_permission('Human Resources') 
  OR user_has_permission('IT Management') 
  OR is_current_user_admin()
)
WITH CHECK (
  user_has_permission('Human Resources') 
  OR user_has_permission('IT Management') 
  OR is_current_user_admin()
);
