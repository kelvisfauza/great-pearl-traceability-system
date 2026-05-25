
DROP POLICY IF EXISTS "Users can view own admin_initiated_withdrawals" ON public.admin_initiated_withdrawals;

CREATE POLICY "Users can view own admin_initiated_withdrawals"
ON public.admin_initiated_withdrawals
FOR SELECT
TO authenticated
USING (LOWER(employee_email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')));
