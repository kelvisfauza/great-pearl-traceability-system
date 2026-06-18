
-- 1) service_provider_payments: restrict SELECT to Finance/Admin
DROP POLICY IF EXISTS "Authenticated users can view service provider payments" ON public.service_provider_payments;
CREATE POLICY "Finance and Admin can view service provider payments"
  ON public.service_provider_payments FOR SELECT
  TO authenticated
  USING (user_has_permission('Finance Management') OR user_has_permission('Finance') OR is_current_user_admin());

-- 2) service_providers: restrict SELECT to Finance/Admin/Procurement
DROP POLICY IF EXISTS "Authenticated users can view service providers" ON public.service_providers;
CREATE POLICY "Finance Admin and Procurement can view service providers"
  ON public.service_providers FOR SELECT
  TO authenticated
  USING (
    user_has_permission('Finance Management')
    OR user_has_permission('Finance')
    OR user_has_permission('Procurement')
    OR is_current_user_admin()
  );

-- 3) supplier_payments: drop the permissive USING(true) duplicates; keep Finance-scoped ones
DROP POLICY IF EXISTS "Allow authenticated users to view supplier_payments" ON public.supplier_payments;
DROP POLICY IF EXISTS "Allow authenticated users to insert supplier_payments" ON public.supplier_payments;
DROP POLICY IF EXISTS "Allow authenticated users to update supplier_payments" ON public.supplier_payments;

-- 4) meal_disbursements: restrict SELECT to Finance/Admin
DROP POLICY IF EXISTS "Authenticated users can view meal disbursements" ON public.meal_disbursements;
CREATE POLICY "Finance and Admin can view meal disbursements"
  ON public.meal_disbursements FOR SELECT
  TO authenticated
  USING (user_has_permission('Finance Management') OR user_has_permission('Finance') OR is_current_user_admin());

-- 5) supplier_contracts: restrict SELECT to Procurement/Finance/Admin
DROP POLICY IF EXISTS "Authenticated view supplier contracts" ON public.supplier_contracts;
CREATE POLICY "Procurement Finance Admin view supplier contracts"
  ON public.supplier_contracts FOR SELECT
  TO authenticated
  USING (
    is_current_user_admin()
    OR user_has_permission('Procurement')
    OR user_has_permission('Finance Management')
    OR user_has_permission('Finance')
  );

-- 6) supplier_expenses: restrict SELECT to Finance/Admin
DROP POLICY IF EXISTS "Authenticated can view supplier expenses" ON public.supplier_expenses;
CREATE POLICY "Finance and Admin view supplier expenses"
  ON public.supplier_expenses FOR SELECT
  TO authenticated
  USING (user_has_permission('Finance Management') OR user_has_permission('Finance') OR is_current_user_admin());

-- 7) Block HR role escalation: only admins may grant Administrator/Super Admin or change roles upward.
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Allow if role unchanged
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- Service role / no auth context (server-side jobs) is allowed
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_admin := public.is_current_user_admin();

  -- Only admins may change roles at all
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only administrators can change employee roles'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_unauthorized_role_change ON public.employees;
CREATE TRIGGER trg_prevent_unauthorized_role_change
  BEFORE UPDATE OF role ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_role_change();
