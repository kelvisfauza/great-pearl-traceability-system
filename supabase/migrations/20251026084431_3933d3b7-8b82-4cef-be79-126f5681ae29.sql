-- Add policy to allow HR and Finance users to update overtime awards (mark as completed)
CREATE POLICY "HR and Finance can complete overtime awards" 
ON public.overtime_awards
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
    AND status = 'Active'
    AND (
      role IN ('Super Admin', 'Administrator', 'Manager')
      OR 'Human Resources' = ANY(permissions)
      OR 'Finance' = ANY(permissions)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
    AND status = 'Active'
    AND (
      role IN ('Super Admin', 'Administrator', 'Manager')
      OR 'Human Resources' = ANY(permissions)
      OR 'Finance' = ANY(permissions)
    )
  )
);