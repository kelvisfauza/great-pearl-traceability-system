-- Simplify the INSERT policy to just check that user is an active employee
DROP POLICY IF EXISTS "Users can create their own money requests" ON public.money_requests;

CREATE POLICY "Users can create their own money requests"
ON public.money_requests
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND status = 'Active'
  )
);