-- Allow Finance and Admin to update approval_requests (for rejections and approvals)
DROP POLICY IF EXISTS "Finance and Admin can update approval requests" ON public.approval_requests;

CREATE POLICY "Finance and Admin can update approval requests"
ON public.approval_requests
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