
CREATE POLICY "Admins HR IT can view all user activity"
ON public.user_activity FOR SELECT
USING (is_current_user_admin() OR user_has_permission('Human Resources') OR user_has_permission('IT'));

CREATE POLICY "Admins HR IT can view all login tracker"
ON public.employee_login_tracker FOR SELECT
USING (is_current_user_admin() OR user_has_permission('Human Resources') OR user_has_permission('IT'));
