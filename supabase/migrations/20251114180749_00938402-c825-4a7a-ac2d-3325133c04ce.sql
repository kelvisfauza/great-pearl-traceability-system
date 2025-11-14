-- Fix RLS policy for approval_requests to allow finance users with permissions
-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Finance and Admin can update approval requests" ON approval_requests;

-- Create a more flexible policy that checks for both roles and permissions
CREATE POLICY "Finance and Admin can update approval requests" ON approval_requests
FOR UPDATE
TO public
USING (
  -- Check if user is authenticated
  auth.uid() IS NOT NULL
  AND
  -- Check if user has appropriate role OR permissions
  EXISTS (
    SELECT 1
    FROM employees
    WHERE employees.email = (
      SELECT users.email
      FROM auth.users
      WHERE users.id = auth.uid()
    )::text
    AND employees.status = 'Active'
    AND (
      -- Role-based check (original logic)
      employees.role IN ('Finance Manager', 'Finance', 'Administrator', 'Super Admin', 'Manager')
      OR
      -- Permission-based check (new logic)
      employees.permissions && ARRAY['Finance', 'Finance Management', 'Finance Approval', 'Administration']
      OR
      -- Granular permissions check
      EXISTS (
        SELECT 1
        FROM unnest(employees.permissions) AS perm
        WHERE perm LIKE 'Finance%' OR perm = 'Administration'
      )
    )
  )
)
WITH CHECK (
  -- Same check for inserts/updates
  auth.uid() IS NOT NULL
  AND
  EXISTS (
    SELECT 1
    FROM employees
    WHERE employees.email = (
      SELECT users.email
      FROM auth.users
      WHERE users.id = auth.uid()
    )::text
    AND employees.status = 'Active'
    AND (
      employees.role IN ('Finance Manager', 'Finance', 'Administrator', 'Super Admin', 'Manager')
      OR
      employees.permissions && ARRAY['Finance', 'Finance Management', 'Finance Approval', 'Administration']
      OR
      EXISTS (
        SELECT 1
        FROM unnest(employees.permissions) AS perm
        WHERE perm LIKE 'Finance%' OR perm = 'Administration'
      )
    )
  )
);