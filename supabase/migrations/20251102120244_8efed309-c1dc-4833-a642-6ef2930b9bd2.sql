-- Allow users to insert their own money requests (salary advances)
DROP POLICY IF EXISTS "Users can create their own money requests" ON public.money_requests;

CREATE POLICY "Users can create their own money requests"
ON public.money_requests
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND employees.status = 'Active'
      AND (
        employees.auth_user_id = auth.uid()
        OR employees.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
  )
);