
-- Fix finance_coffee_lots RLS: the policies check 'Finance Management' but
-- the app uses 'Finance' as the permission name. Also accept 'Administrator' role.
DROP POLICY IF EXISTS "Finance and admins can view finance_coffee_lots" ON public.finance_coffee_lots;
DROP POLICY IF EXISTS "Finance can manage coffee_lots" ON public.finance_coffee_lots;
DROP POLICY IF EXISTS "Finance can update finance_coffee_lots" ON public.finance_coffee_lots;

CREATE POLICY "Finance and admins can view finance_coffee_lots"
ON public.finance_coffee_lots FOR SELECT
USING (
  public.user_has_permission('Finance')
  OR public.user_has_permission('Finance Management')
  OR public.is_current_user_admin()
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.role IN ('Administrator','Super Admin')
      AND e.status = 'Active'
      AND COALESCE(e.disabled, false) = false
  )
);

CREATE POLICY "Finance can manage coffee_lots"
ON public.finance_coffee_lots FOR ALL
USING (
  public.user_has_permission('Finance')
  OR public.user_has_permission('Finance Management')
  OR public.is_current_user_admin()
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.role IN ('Administrator','Super Admin')
      AND e.status = 'Active'
      AND COALESCE(e.disabled, false) = false
  )
);

CREATE POLICY "Finance can update finance_coffee_lots"
ON public.finance_coffee_lots FOR UPDATE
USING (
  public.user_has_permission('Finance')
  OR public.user_has_permission('Finance Management')
  OR public.is_current_user_admin()
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.role IN ('Administrator','Super Admin')
      AND e.status = 'Active'
      AND COALESCE(e.disabled, false) = false
  )
);
