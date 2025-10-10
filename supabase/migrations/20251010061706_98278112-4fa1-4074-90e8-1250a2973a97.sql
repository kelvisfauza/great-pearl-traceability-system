-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can update their own overtime awards" ON public.overtime_awards;

-- Create a new policy that allows users to update awards matching their email
-- This uses a simpler check that doesn't require an employee record
CREATE POLICY "Users can update their own overtime awards by email"
ON public.overtime_awards
FOR UPDATE
USING (
  employee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  employee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);