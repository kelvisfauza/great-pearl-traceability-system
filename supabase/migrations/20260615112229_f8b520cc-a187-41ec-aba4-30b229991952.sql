
-- 1) admin_initiated_withdrawals: split ALL into per-op, restrict SELECT to admins
DROP POLICY IF EXISTS "Admins/Finance manage admin_initiated_withdrawals" ON public.admin_initiated_withdrawals;

CREATE POLICY "Admins can view admin_initiated_withdrawals"
ON public.admin_initiated_withdrawals
FOR SELECT
USING (is_current_user_admin());

CREATE POLICY "Admins/Finance insert admin_initiated_withdrawals"
ON public.admin_initiated_withdrawals
FOR INSERT
WITH CHECK (is_current_user_admin() OR user_has_permission('Finance'::text));

CREATE POLICY "Admins/Finance update admin_initiated_withdrawals"
ON public.admin_initiated_withdrawals
FOR UPDATE
USING (is_current_user_admin() OR user_has_permission('Finance'::text))
WITH CHECK (is_current_user_admin() OR user_has_permission('Finance'::text));

CREATE POLICY "Admins/Finance delete admin_initiated_withdrawals"
ON public.admin_initiated_withdrawals
FOR DELETE
USING (is_current_user_admin() OR user_has_permission('Finance'::text));

-- 2) employees: remove 'User Management:view' from SELECT policy
DROP POLICY IF EXISTS employees_select_policy ON public.employees;

CREATE POLICY employees_select_policy
ON public.employees
FOR SELECT
USING (
  (auth_user_id = auth.uid())
  OR is_current_user_administrator()
  OR user_has_permission('Human Resources:view'::text)
);
