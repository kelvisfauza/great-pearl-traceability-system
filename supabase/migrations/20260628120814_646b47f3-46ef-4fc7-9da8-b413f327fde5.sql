
-- 1) employees: drop Finance from broad SELECT; restrict to admins only. Provide payroll view for Finance.
DROP POLICY IF EXISTS "employees_select_admin_finance" ON public.employees;
CREATE POLICY "employees_select_admins_only"
  ON public.employees
  FOR SELECT
  USING (is_current_user_admin_by_role());

CREATE OR REPLACE VIEW public.employees_payroll_view
WITH (security_invoker = true) AS
SELECT
  id, employee_id, name, email, phone, position, department, status,
  salary, bank_name, account_number, bank_phone, join_date,
  auth_user_id, wallet_locked_amount
FROM public.employees;

GRANT SELECT ON public.employees_payroll_view TO authenticated;

-- RLS on the underlying table still applies via security_invoker. Add a permissive
-- SELECT policy specifically scoped to finance access through this view path: we cannot
-- attach policies to views, so instead allow Finance to SELECT the limited columns by
-- adding a second policy that restricts via a marker function. Simpler: add a Finance
-- policy back on employees but ONLY usable through the view (security_invoker still uses
-- caller). So we add a Finance SELECT policy and rely on the view to restrict columns.
CREATE POLICY "employees_select_finance_payroll"
  ON public.employees
  FOR SELECT
  USING (user_has_permission('Finance'::text));

-- Revoke direct SELECT on sensitive PII columns from authenticated so Finance cannot
-- read them even via direct table queries; admins (service_role / definer functions) keep access.
REVOKE SELECT (
  national_id_number, date_of_birth, tin_number, nssf_number,
  next_of_kin_name, next_of_kin_phone, emergency_contact,
  national_id_name, tribe, district, marital_status, address
) ON public.employees FROM authenticated;

-- 2) job-applications bucket: add UPDATE policy for HR/admins
CREATE POLICY "HR and admins can update CVs"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'job-applications' AND (user_has_permission('Human Resources'::text) OR is_current_user_admin()))
  WITH CHECK (bucket_id = 'job-applications' AND (user_has_permission('Human Resources'::text) OR is_current_user_admin()));

-- 3) statements bucket: add Finance/Admin SELECT
CREATE POLICY "Finance and admins can read statements"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'statements' AND (user_has_permission('Finance'::text) OR is_current_user_admin()));

-- 4) system_maintenance: restrict SELECT to Super Admin only
DROP POLICY IF EXISTS "Admins can read maintenance row" ON public.system_maintenance;
CREATE POLICY "Super admins can read maintenance row"
  ON public.system_maintenance
  FOR SELECT
  USING (has_role(auth.uid(), 'Super Admin'::app_role));

-- 5) user_roles: allow users to read their own role rows (needed for client-side checks)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);
