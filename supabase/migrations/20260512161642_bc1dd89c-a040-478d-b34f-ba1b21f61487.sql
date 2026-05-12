-- ===========================================================
-- 1. finance_advances: restrict to Finance + Admin
-- ===========================================================
DROP POLICY IF EXISTS "Finance users can manage advances" ON public.finance_advances;
CREATE POLICY "Finance and admins can manage advances"
ON public.finance_advances FOR ALL
TO authenticated
USING (
  public.is_current_user_admin()
  OR public.user_has_permission('Finance')
  OR public.user_has_permission('Finance Manager')
)
WITH CHECK (
  public.is_current_user_admin()
  OR public.user_has_permission('Finance')
  OR public.user_has_permission('Finance Manager')
);

-- ===========================================================
-- 2. employees: block privilege escalation via self-update
-- ===========================================================
CREATE OR REPLACE FUNCTION public.prevent_employee_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and HR can change anything
  IF public.is_current_user_admin()
     OR public.user_has_permission('Human Resources')
     OR public.user_has_permission('HR Manager')
  THEN
    RETURN NEW;
  END IF;

  -- Otherwise, block changes to sensitive columns
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.permissions IS DISTINCT FROM OLD.permissions
     OR NEW.bypass_sms_verification IS DISTINCT FROM OLD.bypass_sms_verification
     OR NEW.disabled IS DISTINCT FROM OLD.disabled
     OR NEW.wallet_frozen IS DISTINCT FROM OLD.wallet_frozen
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.salary IS DISTINCT FROM OLD.salary
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.department IS DISTINCT FROM OLD.department
     OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
  THEN
    RAISE EXCEPTION 'Permission denied: cannot modify privileged employee fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_employee_priv_escalation ON public.employees;
CREATE TRIGGER trg_prevent_employee_priv_escalation
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.prevent_employee_privilege_escalation();

-- ===========================================================
-- 3. milling_customers: restrict broad UPDATE policy
-- ===========================================================
DROP POLICY IF EXISTS "Authenticated can update milling customer balance" ON public.milling_customers;

-- ===========================================================
-- 4. milling_customer_accounts: restrict to Milling + Admin
-- ===========================================================
DROP POLICY IF EXISTS "Authenticated users can manage milling accounts" ON public.milling_customer_accounts;
CREATE POLICY "Milling staff and admins can manage milling accounts"
ON public.milling_customer_accounts FOR ALL
TO authenticated
USING (
  public.is_current_user_admin()
  OR public.user_has_permission('Milling')
  OR public.user_has_permission('Milling Operations')
  OR public.user_has_permission('Finance')
)
WITH CHECK (
  public.is_current_user_admin()
  OR public.user_has_permission('Milling')
  OR public.user_has_permission('Milling Operations')
  OR public.user_has_permission('Finance')
);

-- ===========================================================
-- 5. contract_allocations: restrict to Sales/Procurement/Admin
-- ===========================================================
DROP POLICY IF EXISTS "Authenticated users can manage contract allocations" ON public.contract_allocations;
CREATE POLICY "Sales procurement admins manage contract allocations"
ON public.contract_allocations FOR ALL
TO authenticated
USING (
  public.is_current_user_admin()
  OR public.user_has_permission('Sales Marketing')
  OR public.user_has_permission('Sales')
  OR public.user_has_permission('Procurement')
  OR public.user_has_permission('Procurement Management')
)
WITH CHECK (
  public.is_current_user_admin()
  OR public.user_has_permission('Sales Marketing')
  OR public.user_has_permission('Sales')
  OR public.user_has_permission('Procurement')
  OR public.user_has_permission('Procurement Management')
);

-- ===========================================================
-- 6. store_stock_verifications: restrict to Store + Admin
-- ===========================================================
DROP POLICY IF EXISTS "Authenticated users can manage store verifications" ON public.store_stock_verifications;
CREATE POLICY "Store staff and admins manage stock verifications"
ON public.store_stock_verifications FOR ALL
TO authenticated
USING (
  public.is_current_user_admin()
  OR public.user_has_permission('Store Management')
  OR public.user_has_permission('Store')
  OR public.user_has_permission('Inventory')
)
WITH CHECK (
  public.is_current_user_admin()
  OR public.user_has_permission('Store Management')
  OR public.user_has_permission('Store')
  OR public.user_has_permission('Inventory')
);

-- ===========================================================
-- 7. store_damaged_bags: restrict to Store + Admin
-- ===========================================================
DROP POLICY IF EXISTS "Authenticated users can manage damaged bags" ON public.store_damaged_bags;
CREATE POLICY "Store staff and admins manage damaged bags"
ON public.store_damaged_bags FOR ALL
TO authenticated
USING (
  public.is_current_user_admin()
  OR public.user_has_permission('Store Management')
  OR public.user_has_permission('Store')
  OR public.user_has_permission('Inventory')
)
WITH CHECK (
  public.is_current_user_admin()
  OR public.user_has_permission('Store Management')
  OR public.user_has_permission('Store')
  OR public.user_has_permission('Inventory')
);

-- ===========================================================
-- 8. system_console_logs: restrict DELETE to IT + Admin
-- ===========================================================
DROP POLICY IF EXISTS "IT staff can delete old logs" ON public.system_console_logs;
CREATE POLICY "IT staff and admins can delete old logs"
ON public.system_console_logs FOR DELETE
TO authenticated
USING (
  public.is_current_user_admin()
  OR public.user_has_permission('IT Management')
  OR public.user_has_permission('IT')
);

-- ===========================================================
-- 9. announcements: restrict UPDATE to creator/HR/Admin
-- ===========================================================
DROP POLICY IF EXISTS "Authenticated users can update announcements" ON public.announcements;
CREATE POLICY "Creator HR and admins can update announcements"
ON public.announcements FOR UPDATE
TO authenticated
USING (
  public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('HR Manager')
  OR created_by = (SELECT email FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1)
)
WITH CHECK (
  public.is_current_user_admin()
  OR public.user_has_permission('Human Resources')
  OR public.user_has_permission('HR Manager')
  OR created_by = (SELECT email FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- ===========================================================
-- 10. logistics_shipments: restrict to Logistics/Sales/Admin
-- ===========================================================
DROP POLICY IF EXISTS "Authenticated users can manage shipments" ON public.logistics_shipments;
CREATE POLICY "Logistics sales admins manage shipments"
ON public.logistics_shipments FOR ALL
TO authenticated
USING (
  public.is_current_user_admin()
  OR public.user_has_permission('Logistics')
  OR public.user_has_permission('Sales Marketing')
  OR public.user_has_permission('Sales')
)
WITH CHECK (
  public.is_current_user_admin()
  OR public.user_has_permission('Logistics')
  OR public.user_has_permission('Sales Marketing')
  OR public.user_has_permission('Sales')
);