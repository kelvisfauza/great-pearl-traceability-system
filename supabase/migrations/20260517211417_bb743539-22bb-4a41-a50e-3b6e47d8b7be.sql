
-- ============================================================
-- Security hardening migration
-- ============================================================

-- 1) employees: prevent self privilege escalation via trigger
-- The existing "Employees can update own bank details" policy allows row-scoped
-- updates. We block changes to sensitive columns unless the actor is an admin.
CREATE OR REPLACE FUNCTION public.prevent_employee_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := false;
BEGIN
  -- Service role / no auth context = trusted backend path
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    is_admin := public.is_current_user_admin();
  EXCEPTION WHEN OTHERS THEN
    is_admin := false;
  END;

  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Non-admin: forbid changes to privilege / financial / account-control fields
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.permissions IS DISTINCT FROM OLD.permissions
     OR NEW.salary IS DISTINCT FROM OLD.salary
     OR NEW.disabled IS DISTINCT FROM OLD.disabled
     OR NEW.wallet_frozen IS DISTINCT FROM OLD.wallet_frozen
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.department IS DISTINCT FROM OLD.department
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
  THEN
    RAISE EXCEPTION 'Not authorized to modify privileged fields on employees'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_employee_self_escalation ON public.employees;
CREATE TRIGGER trg_prevent_employee_self_escalation
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.prevent_employee_self_escalation();

-- 2) milling_cash_transactions: restrict INSERT
DROP POLICY IF EXISTS "Authenticated users can insert milling cash transactions" ON public.milling_cash_transactions;
DROP POLICY IF EXISTS "Anyone authenticated can insert milling cash transactions" ON public.milling_cash_transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.milling_cash_transactions;
CREATE POLICY "Milling staff can insert milling cash transactions"
ON public.milling_cash_transactions
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_permission('Milling Operations') OR public.is_current_user_admin());

-- 3) milling_transactions: restrict INSERT
DROP POLICY IF EXISTS "Authenticated users can insert milling transactions" ON public.milling_transactions;
DROP POLICY IF EXISTS "Anyone authenticated can insert milling transactions" ON public.milling_transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.milling_transactions;
CREATE POLICY "Milling staff can insert milling transactions"
ON public.milling_transactions
FOR INSERT
TO authenticated
WITH CHECK (public.user_has_permission('Milling Operations') OR public.is_current_user_admin());

-- 4) monthly_overtime_reviews: restrict UPDATE to HR / admin
DROP POLICY IF EXISTS "Admins can update overtime reviews" ON public.monthly_overtime_reviews;
CREATE POLICY "HR and admins can update overtime reviews"
ON public.monthly_overtime_reviews
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin() OR public.user_has_permission('Human Resources'))
WITH CHECK (public.is_current_user_admin() OR public.user_has_permission('Human Resources'));

-- 5) time_deductions: scope INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can insert time deductions" ON public.time_deductions;
DROP POLICY IF EXISTS "Authenticated users can update time deductions" ON public.time_deductions;
DROP POLICY IF EXISTS "Authenticated users can delete time deductions" ON public.time_deductions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.time_deductions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.time_deductions;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.time_deductions;

CREATE POLICY "HR/Finance/admin can insert time deductions"
ON public.time_deductions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Finance')
);

CREATE POLICY "HR/Finance/admin can update time deductions"
ON public.time_deductions
FOR UPDATE
TO authenticated
USING (
  public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Finance')
)
WITH CHECK (
  public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Finance')
);

CREATE POLICY "Admins can delete time deductions"
ON public.time_deductions
FOR DELETE
TO authenticated
USING (public.is_current_user_admin());

-- 6) per_diem_awards: restrict INSERT
DROP POLICY IF EXISTS "Authenticated users can insert per diem awards" ON public.per_diem_awards;
DROP POLICY IF EXISTS "Anyone authenticated can insert per diem" ON public.per_diem_awards;
CREATE POLICY "HR/Finance/admin can insert per diem awards"
ON public.per_diem_awards
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('Finance')
);

-- 7) storage.objects: drop overly broad profile_pictures UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile pictures" ON storage.objects;
