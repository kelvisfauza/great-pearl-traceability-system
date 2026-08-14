-- 1) risk_assessments: restrict creation to management/finance/admin roles
DROP POLICY IF EXISTS "Users can create risk assessments" ON public.risk_assessments;
CREATE POLICY "Management can create risk assessments"
ON public.risk_assessments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = generated_by_user_id
  AND (
    public.is_current_user_admin()
    OR public.user_has_permission('Management')
    OR public.user_has_permission('Finance Management')
  )
);

-- 2) system_console_logs: derive identity fields server-side to prevent log forgery
CREATE OR REPLACE FUNCTION public.enforce_console_log_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name, department INTO emp
  FROM public.employees
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  NEW.user_id := auth.uid()::text;
  NEW.user_name := COALESCE(emp.name, 'Unknown User');
  NEW.user_department := COALESCE(emp.department, 'Unknown');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_console_log_identity ON public.system_console_logs;
CREATE TRIGGER trg_enforce_console_log_identity
BEFORE INSERT ON public.system_console_logs
FOR EACH ROW EXECUTE FUNCTION public.enforce_console_log_identity();

-- 3) verification_audit_logs: only real admins/IT may write audit entries
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.verification_audit_logs;
CREATE POLICY "Admins can create verification audit logs"
ON public.verification_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = admin_user
  AND (
    public.is_current_user_admin()
    OR public.user_has_permission('IT Management')
  )
);