
-- Re-create the self-SELECT policy
CREATE POLICY "Users can view own admin_initiated_withdrawals"
  ON public.admin_initiated_withdrawals
  FOR SELECT
  TO authenticated
  USING (
    employee_email = ((SELECT email FROM auth.users WHERE id = auth.uid()))::text
  );

-- Column-level lockdown: never expose pin_code to client roles.
REVOKE SELECT (pin_code) ON public.admin_initiated_withdrawals FROM anon, authenticated;
