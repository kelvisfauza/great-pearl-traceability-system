
-- Create a test function to verify auth.uid() works correctly
CREATE OR REPLACE FUNCTION public.test_rls_auth_context()
RETURNS TABLE(
  current_uid uuid,
  employee_found boolean,
  employee_email text,
  employee_status text,
  employee_role text,
  has_qc_create boolean,
  has_qc_general boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_uid,
    EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid()) as employee_found,
    (SELECT email FROM employees WHERE auth_user_id = auth.uid()) as employee_email,
    (SELECT status FROM employees WHERE auth_user_id = auth.uid()) as employee_status,
    (SELECT role FROM employees WHERE auth_user_id = auth.uid()) as employee_role,
    (SELECT 'Quality Control:create' = ANY(permissions) FROM employees WHERE auth_user_id = auth.uid()) as has_qc_create,
    (SELECT 'Quality Control' = ANY(permissions) FROM employees WHERE auth_user_id = auth.uid()) as has_qc_general;
END;
$$;
