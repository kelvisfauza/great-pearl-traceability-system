-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage overtime awards" ON public.overtime_awards;
DROP POLICY IF EXISTS "Users can view their own overtime awards" ON public.overtime_awards;
DROP POLICY IF EXISTS "Users can update their own overtime claims" ON public.overtime_awards;

-- Create better RLS policies
-- Admins can do everything
CREATE POLICY "Admins have full access to overtime awards"
  ON public.overtime_awards
  FOR ALL
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Users can view their own awards
CREATE POLICY "Users can view their own overtime awards"
  ON public.overtime_awards
  FOR SELECT
  USING (
    employee_email IN (
      SELECT email FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );

-- Users can claim their own awards (update to claimed status)
CREATE POLICY "Users can claim their own overtime awards"
  ON public.overtime_awards
  FOR UPDATE
  USING (
    employee_email IN (
      SELECT email FROM public.employees WHERE auth_user_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    employee_email IN (
      SELECT email FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );