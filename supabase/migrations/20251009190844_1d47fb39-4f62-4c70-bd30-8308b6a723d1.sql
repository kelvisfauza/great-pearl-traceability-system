-- Drop all existing policies on overtime_awards
DROP POLICY IF EXISTS "Admins have full access to overtime awards" ON public.overtime_awards;
DROP POLICY IF EXISTS "Users can view their own overtime awards" ON public.overtime_awards;
DROP POLICY IF EXISTS "Users can claim their own overtime awards" ON public.overtime_awards;

-- Simplified policies that work for all roles
-- Policy 1: Everyone authenticated can view all overtime awards (needed for admin views)
CREATE POLICY "Anyone authenticated can view overtime awards"
  ON public.overtime_awards
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Admins can insert overtime awards
CREATE POLICY "Admins can create overtime awards"
  ON public.overtime_awards
  FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

-- Policy 3: Users can update their own awards to claim them
CREATE POLICY "Users can update their own overtime awards"
  ON public.overtime_awards
  FOR UPDATE
  TO authenticated
  USING (
    employee_email IN (
      SELECT email FROM public.employees WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    employee_email IN (
      SELECT email FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );

-- Policy 4: Admins can update any overtime award
CREATE POLICY "Admins can update all overtime awards"
  ON public.overtime_awards
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Policy 5: Only admins can delete overtime awards
CREATE POLICY "Admins can delete overtime awards"
  ON public.overtime_awards
  FOR DELETE
  TO authenticated
  USING (is_current_user_admin());