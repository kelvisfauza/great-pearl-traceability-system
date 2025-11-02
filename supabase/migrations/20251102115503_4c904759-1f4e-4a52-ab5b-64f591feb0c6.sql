-- Fix RLS policies for money_requests to allow rejections by Finance/Admin users

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Finance can update money requests for approval" ON public.money_requests;

-- Create a more flexible policy that allows updates by Finance/Admin roles
CREATE POLICY "Finance and Admin can update money requests"
ON public.money_requests
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND employees.role IN ('Finance Manager', 'Finance', 'Administrator', 'Super Admin')
      AND employees.status = 'Active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND employees.role IN ('Finance Manager', 'Finance', 'Administrator', 'Super Admin')
      AND employees.status = 'Active'
  )
);