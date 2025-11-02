-- Update INSERT policy to match by email as fallback
DROP POLICY IF EXISTS "Users can create their own money requests" ON public.money_requests;

CREATE POLICY "Users can create their own money requests"
ON public.money_requests
FOR INSERT
TO public
WITH CHECK (
  -- Must be an active employee (match by auth_user_id OR email)
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE (e.auth_user_id = auth.uid() OR e.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
      AND e.status = 'Active'
  )
);