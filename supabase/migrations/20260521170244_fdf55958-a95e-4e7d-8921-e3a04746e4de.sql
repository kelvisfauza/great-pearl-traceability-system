
-- 1. Fix employee_role_locks policy to use auth.uid() instead of auth.email()
DROP POLICY IF EXISTS "Admins manage role locks" ON public.employee_role_locks;
CREATE POLICY "Admins manage role locks"
  ON public.employee_role_locks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.role = 'Administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.role = 'Administrator'
    )
  );

-- 2. Replace hardcoded-UUID super admin check with a real employee-based lookup
CREATE OR REPLACE FUNCTION public.is_super_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.auth_user_id = _uid
      AND e.role = 'Administrator'
      AND lower(e.email) = lower('Fauzakusa@greatpearlcoffee.com')
  );
$function$;

-- 3. Let employees read their own payslips
DROP POLICY IF EXISTS "Employees can view their own payslips" ON public.salary_payslips;
CREATE POLICY "Employees can view their own payslips"
  ON public.salary_payslips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.id = salary_payslips.employee_id
    )
  );
