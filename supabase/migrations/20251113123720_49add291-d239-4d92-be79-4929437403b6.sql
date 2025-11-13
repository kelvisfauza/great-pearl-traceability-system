-- Enable RLS on money_requests
ALTER TABLE money_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Finance and Admin can view money requests" ON money_requests;
DROP POLICY IF EXISTS "Users can view their own money requests" ON money_requests;
DROP POLICY IF EXISTS "Anyone can insert money requests" ON money_requests;
DROP POLICY IF EXISTS "Finance and Admin can update money requests" ON money_requests;
DROP POLICY IF EXISTS "Only admins can delete money requests" ON money_requests;

-- Allow users to view their own money requests
CREATE POLICY "Users can view their own money requests"
ON money_requests
FOR SELECT
USING (
  user_id::uuid = auth.uid()
  OR requested_by = (SELECT email FROM employees WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Allow Finance and Admin roles to view all money requests
CREATE POLICY "Finance and Admin can view money requests"
ON money_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
    AND role IN ('Finance Manager', 'Finance', 'Administrator', 'Super Admin')
    AND status = 'Active'
  )
);

-- Allow anyone to insert money requests
CREATE POLICY "Anyone can insert money requests"
ON money_requests
FOR INSERT
WITH CHECK (true);

-- Allow Finance and Admin to update money requests
CREATE POLICY "Finance and Admin can update money requests"
ON money_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
    AND role IN ('Finance Manager', 'Finance', 'Administrator', 'Super Admin')
    AND status = 'Active'
  )
);

-- Only admins can delete money requests
CREATE POLICY "Only admins can delete money requests"
ON money_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE auth_user_id = auth.uid()
    AND role IN ('Administrator', 'Super Admin')
    AND status = 'Active'
  )
);