-- Fix the INSERT policy for money_requests to properly validate user_id
DROP POLICY IF EXISTS "Users can create their own money requests" ON public.money_requests;

CREATE POLICY "Users can create their own money requests"
ON public.money_requests
FOR INSERT
TO public
WITH CHECK (
  -- Must be an active employee
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND status = 'Active'
  )
  AND
  -- The user_id being inserted must match the employee's auth_user_id
  user_id IN (
    SELECT auth_user_id FROM public.employees 
    WHERE auth_user_id = auth.uid() AND status = 'Active'
  )
);