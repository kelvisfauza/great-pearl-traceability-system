DROP POLICY IF EXISTS "Users can view their own overdraft account" ON public.overdraft_accounts;

CREATE POLICY "Users can view their own overdraft account"
ON public.overdraft_accounts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR employee_email = lower(coalesce(auth.jwt() ->> 'email', ''))
  OR lower(employee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  OR has_role(auth.uid(), 'Administrator'::app_role)
  OR has_role(auth.uid(), 'Super Admin'::app_role)
  OR has_role(auth.uid(), 'finance_manager'::app_role)
  OR has_role(auth.uid(), 'finance_assistant'::app_role)
);