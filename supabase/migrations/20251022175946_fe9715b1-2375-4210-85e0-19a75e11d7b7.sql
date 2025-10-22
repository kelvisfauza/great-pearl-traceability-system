-- Ensure approval_requests table has proper RLS policies for reporting

-- First, enable RLS if not already enabled
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view approval_requests" ON approval_requests;
DROP POLICY IF EXISTS "Anyone can insert approval_requests" ON approval_requests;
DROP POLICY IF EXISTS "Anyone can update approval_requests" ON approval_requests;
DROP POLICY IF EXISTS "Only admins can delete approval_requests" ON approval_requests;

-- Create new policies with proper access control
CREATE POLICY "Anyone can view approval_requests"
  ON approval_requests
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert approval_requests"
  ON approval_requests
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update approval_requests"
  ON approval_requests
  FOR UPDATE
  USING (true);

CREATE POLICY "Only admins can delete approval_requests"
  ON approval_requests
  FOR DELETE
  USING (is_current_user_admin());