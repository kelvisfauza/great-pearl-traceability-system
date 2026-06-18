DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;

CREATE POLICY "employees_select_policy"
ON public.employees
FOR SELECT
USING (
  (auth_user_id = auth.uid())
  OR is_current_user_administrator()
  OR user_has_permission('Human Resources:view')
  OR user_has_permission('IT Management')
);