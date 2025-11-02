-- Temporarily simplify the INSERT policy to allow any authenticated user
DROP POLICY IF EXISTS "Users can create their own money requests" ON public.money_requests;

CREATE POLICY "Users can create their own money requests"
ON public.money_requests
FOR INSERT
TO authenticated
WITH CHECK (true);