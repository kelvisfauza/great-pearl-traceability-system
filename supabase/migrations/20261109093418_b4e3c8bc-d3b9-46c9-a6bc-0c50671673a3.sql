ALTER POLICY "Users view own evaluations" ON public.loan_evaluations USING (
  employee_email = (select public.current_user_email())
  OR (select public.is_current_user_admin())
  OR has_role(auth.uid(), 'Administrator'::app_role) OR has_role(auth.uid(), 'Super Admin'::app_role)
);