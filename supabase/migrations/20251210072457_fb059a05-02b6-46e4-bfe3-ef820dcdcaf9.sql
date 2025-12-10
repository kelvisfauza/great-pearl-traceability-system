-- Fix: Remove IT Management access from employees table SELECT policy
-- IT staff should not have access to sensitive employee data (salary, emergency contacts)

DROP POLICY IF EXISTS "Users view own employee record" ON public.employees;

CREATE POLICY "Users view own employee record" 
ON public.employees 
FOR SELECT 
TO authenticated
USING (
  auth_user_id = auth.uid() OR
  public.user_has_permission('Human Resources') OR
  public.is_current_user_admin()
);