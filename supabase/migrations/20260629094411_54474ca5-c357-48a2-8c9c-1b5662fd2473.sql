
DROP POLICY IF EXISTS "employees_select_finance_payroll" ON public.employees;

CREATE OR REPLACE VIEW public.employees_payroll_safe
WITH (security_invoker = true) AS
SELECT
  id, auth_user_id, employee_id, name, email, phone, department, role, status,
  salary, bank_name, account_number, bank_phone, tin_number, nssf_number,
  wallet_locked_amount, wallet_locked_at, wallet_locked_reason,
  disabled, created_at, updated_at
FROM public.employees
WHERE
  is_current_user_admin_by_role()
  OR user_has_permission('Finance')
  OR auth_user_id = auth.uid();

GRANT SELECT ON public.employees_payroll_safe TO authenticated;

CREATE POLICY "HR can view attendance time records"
ON public.attendance_time_records
FOR SELECT
USING (user_has_permission('Human Resources') OR user_has_permission('Human Resources:view'));

DROP POLICY IF EXISTS "Authorized staff view sms logs" ON public.sms_logs;
CREATE POLICY "Authorized staff view sms logs"
ON public.sms_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND (
        e.role IN ('Super Admin','Administrator')
        OR 'IT Management' = ANY (e.permissions)
        OR (
          'Human Resources' = ANY (e.permissions)
          AND COALESCE(sms_logs.department, '') ILIKE 'Human Resources%'
        )
      )
  )
);

DROP POLICY IF EXISTS "Admins can update maintenance status" ON public.system_maintenance;
CREATE POLICY "Super admins can update maintenance status"
ON public.system_maintenance
FOR UPDATE
USING (has_role(auth.uid(), 'Super Admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'Super Admin'::app_role));
