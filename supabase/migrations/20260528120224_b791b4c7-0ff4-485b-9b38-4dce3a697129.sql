
-- 1) Prevent self privilege escalation on employees via BEFORE UPDATE trigger
CREATE OR REPLACE FUNCTION public.prevent_employee_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  -- Allow service role / no-auth contexts (server-side jobs, triggers) to bypass
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine if caller is Administrator / Super Admin
  BEGIN
    v_is_admin := public.is_current_user_administrator();
  EXCEPTION WHEN OTHERS THEN
    v_is_admin := false;
  END;

  IF NOT v_is_admin THEN
    BEGIN
      v_is_admin := public.is_current_user_admin();
    EXCEPTION WHEN OTHERS THEN
      -- ignore
    END;
  END IF;

  -- Block any user from changing sensitive fields on THEIR OWN record
  IF NEW.auth_user_id IS NOT NULL AND NEW.auth_user_id = v_uid THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.permissions IS DISTINCT FROM OLD.permissions
       OR NEW.disabled IS DISTINCT FROM OLD.disabled
       OR NEW.wallet_frozen IS DISTINCT FROM OLD.wallet_frozen THEN
      RAISE EXCEPTION 'You cannot modify your own role, permissions, disabled, or wallet_frozen fields'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Role / permissions changes on any record require admin
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.permissions IS DISTINCT FROM OLD.permissions)
     AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Only Administrators or Super Admins can change role or permissions'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_employee_privilege_escalation ON public.employees;
CREATE TRIGGER trg_prevent_employee_privilege_escalation
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.prevent_employee_privilege_escalation();

-- 2) Fix broken face_credentials admin policy
DROP POLICY IF EXISTS "Admins manage face credentials" ON public.face_credentials;
CREATE POLICY "Admins manage face credentials"
ON public.face_credentials
FOR ALL
TO authenticated
USING (public.is_current_user_administrator())
WITH CHECK (public.is_current_user_administrator());

-- 3) Tighten salary_remittance_payments policy (was WITH CHECK true)
DROP POLICY IF EXISTS "Staff manage remittance payments" ON public.salary_remittance_payments;
CREATE POLICY "Staff manage remittance payments"
ON public.salary_remittance_payments
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'Super Admin'::app_role)
  OR has_role(auth.uid(), 'Administrator'::app_role)
  OR has_role(auth.uid(), 'finance_manager'::app_role)
  OR has_role(auth.uid(), 'finance_assistant'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND lower(COALESCE(e.department, '')) = ANY (ARRAY['hr','human resources','finance','administrator','administration'])
  )
)
WITH CHECK (
  has_role(auth.uid(), 'Super Admin'::app_role)
  OR has_role(auth.uid(), 'Administrator'::app_role)
  OR has_role(auth.uid(), 'finance_manager'::app_role)
  OR has_role(auth.uid(), 'finance_assistant'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND lower(COALESCE(e.department, '')) = ANY (ARRAY['hr','human resources','finance','administrator','administration'])
  )
);
