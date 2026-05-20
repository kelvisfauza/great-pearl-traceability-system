DROP POLICY IF EXISTS "Users view own presence or admins view all" ON public.user_presence;

CREATE POLICY "Users view own presence or admins view all"
ON public.user_presence
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_current_user_admin()
  OR public.is_current_user_administrator()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('IT Management')
);