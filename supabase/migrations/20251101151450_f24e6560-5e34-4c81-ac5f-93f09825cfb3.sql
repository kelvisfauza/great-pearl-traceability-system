-- Allow Finance users to update money_requests for approval workflow
CREATE POLICY "Finance can update money requests for approval"
ON public.money_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('Finance Manager', 'Finance', 'Administrator', 'Super Admin')
    AND status = 'Active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('Finance Manager', 'Finance', 'Administrator', 'Super Admin')
    AND status = 'Active'
  )
);

-- Also ensure Finance can view all money requests (for the approval queue)
CREATE POLICY "Finance can view all money requests"
ON public.money_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('Finance Manager', 'Finance', 'Administrator', 'Super Admin')
    AND status = 'Active'
  )
);