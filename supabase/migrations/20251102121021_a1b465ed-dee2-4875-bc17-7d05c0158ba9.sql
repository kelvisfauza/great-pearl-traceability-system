-- Remove duplicate INSERT policy and fix SELECT policy
DROP POLICY IF EXISTS "Users can create money requests" ON public.money_requests;

-- Ensure SELECT policy allows users to view their own requests by auth_user_id
DROP POLICY IF EXISTS "Users can view their own money requests" ON public.money_requests;

CREATE POLICY "Users can view their own money requests"
ON public.money_requests
FOR SELECT
TO public
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid() 
    AND email = money_requests.requested_by
  )
);