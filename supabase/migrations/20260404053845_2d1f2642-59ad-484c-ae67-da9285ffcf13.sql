-- Allow authenticated employees to insert their own loan applications
DROP POLICY IF EXISTS "Finance can insert loans" ON public.loans;

CREATE POLICY "Authenticated users can insert loans"
ON public.loans
FOR INSERT
TO authenticated
WITH CHECK (
  employee_email = get_current_user_email()
  OR user_has_permission('Finance'::text)
  OR is_current_user_admin()
);