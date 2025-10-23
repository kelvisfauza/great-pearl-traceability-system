-- Drop the overly restrictive INSERT policy
DROP POLICY IF EXISTS "Admins can create overtime awards" ON public.overtime_awards;

-- Create a more permissive INSERT policy that allows HR, Managers, and Admins
CREATE POLICY "HR and Admins can create overtime awards" 
ON public.overtime_awards
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
    AND status = 'Active'
    AND (
      role IN ('Super Admin', 'Administrator', 'Manager')
      OR 'Human Resources' = ANY(permissions)
    )
  )
);