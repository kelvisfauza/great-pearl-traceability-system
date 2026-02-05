
-- =============================================
-- FIX 1: Tighten overly permissive RLS policies
-- =============================================

-- system_console_logs: restrict to IT/admin
DROP POLICY IF EXISTS "IT staff can view all console logs" ON system_console_logs;
CREATE POLICY "IT and admins view console logs"
  ON system_console_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.auth_user_id = auth.uid()
      AND (
        employees.role IN ('Super Admin', 'Administrator')
        OR 'IT Management' = ANY(employees.permissions)
      )
    )
  );

-- sms_logs: restrict to admin/IT/HR
DROP POLICY IF EXISTS "sms_logs_select_policy" ON sms_logs;
CREATE POLICY "Authorized staff view sms logs"
  ON sms_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.auth_user_id = auth.uid()
      AND (
        employees.role IN ('Super Admin', 'Administrator')
        OR 'IT Management' = ANY(employees.permissions)
        OR 'Human Resources' = ANY(employees.permissions)
      )
    )
  );

-- finance_cash_balance: restrict to finance/admin
DROP POLICY IF EXISTS "Anyone can view finance_cash_balance" ON finance_cash_balance;
CREATE POLICY "Finance staff view cash balance"
  ON finance_cash_balance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.auth_user_id = auth.uid()
      AND (
        employees.role IN ('Super Admin', 'Administrator', 'Manager')
        OR 'Finance' = ANY(employees.permissions)
        OR 'Finance Management' = ANY(employees.permissions)
      )
    )
  );

-- =============================================
-- FIX 2: Secure audit_logs from tampering
-- =============================================

-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON audit_logs;

-- Create a secure SECURITY DEFINER function for audit logging
CREATE OR REPLACE FUNCTION public.log_audit_action(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id TEXT,
  p_reason TEXT DEFAULT NULL,
  p_record_data JSONB DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_email TEXT;
  v_department TEXT;
  v_audit_id UUID;
BEGIN
  -- Get current user's email and department from employees table
  SELECT email, department INTO v_user_email, v_department
  FROM employees
  WHERE auth_user_id = auth.uid();

  -- Prevent impersonation - always use authenticated user
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User not found in employee records';
  END IF;

  -- Insert audit log with validated user info
  INSERT INTO audit_logs (
    action,
    table_name,
    record_id,
    performed_by,
    department,
    reason,
    record_data,
    created_at
  ) VALUES (
    p_action,
    p_table_name,
    p_record_id,
    v_user_email,
    v_department,
    p_reason,
    p_record_data,
    NOW()
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.log_audit_action TO authenticated;

-- Allow inserts only via the SECURITY DEFINER function (service_role for edge functions)
CREATE POLICY "Only service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (
    (SELECT current_setting('role')) = 'service_role'
  );

-- Prevent UPDATE and DELETE on audit logs (immutable)
DROP POLICY IF EXISTS "No one can update audit logs" ON audit_logs;
CREATE POLICY "No one can update audit logs"
  ON audit_logs
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "No one can delete audit logs" ON audit_logs;
CREATE POLICY "No one can delete audit logs"
  ON audit_logs
  FOR DELETE
  USING (false);
