-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can update their own overtime awards by email" ON public.overtime_awards;

-- Create a new policy that uses JWT email instead of querying auth.users
CREATE POLICY "Users can update their own overtime awards by email"
ON public.overtime_awards
FOR UPDATE
USING (
  employee_email = (auth.jwt()->>'email')
)
WITH CHECK (
  employee_email = (auth.jwt()->>'email')
);