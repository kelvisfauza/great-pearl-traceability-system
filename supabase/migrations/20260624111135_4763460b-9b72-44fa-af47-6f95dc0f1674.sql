
-- 1. Widen is_current_user_admin to include Administrator/Admin/Managing Director
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND role = ANY (ARRAY['Admin','Administrator','Super Admin','Managing Director'])
      AND status = 'Active'
      AND COALESCE(disabled, false) = false
  );
$function$;

-- 2. employees: tighten select policy. Drop HR:view broad access; allow self, admins, or HR:edit-permitted users.
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
CREATE POLICY "employees_select_policy" ON public.employees
FOR SELECT TO authenticated
USING (
  auth_user_id = auth.uid()
  OR public.is_current_user_admin_by_role()
  OR public.user_has_permission('Human Resources:edit')
);

-- 3. birthday_rewards: restrict to admin or self
DROP POLICY IF EXISTS "Authenticated can view birthday rewards" ON public.birthday_rewards;
CREATE POLICY "Admins or self view birthday rewards" ON public.birthday_rewards
FOR SELECT TO authenticated
USING (
  public.is_current_user_admin_by_role()
  OR employee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 4. employee_of_the_month: hide bonus_amount details; restrict full row to admin or self
DROP POLICY IF EXISTS "Everyone can view employee of the month" ON public.employee_of_the_month;
CREATE POLICY "Admins or self view employee of the month" ON public.employee_of_the_month
FOR SELECT TO authenticated
USING (
  public.is_current_user_admin_by_role()
  OR employee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 5. device_sessions: revoke verification_token column access from authenticated (server-side only)
REVOKE SELECT (verification_token) ON public.device_sessions FROM authenticated;
REVOKE SELECT (verification_token) ON public.device_sessions FROM anon;

-- 6. face_credentials: revoke descriptor column access from authenticated (server-side matching only)
REVOKE SELECT (descriptor) ON public.face_credentials FROM authenticated;
REVOKE SELECT (descriptor) ON public.face_credentials FROM anon;

-- 7. finance_reconciliations / finance_reconciliation_items: add Finance/Admin policies
CREATE POLICY "Finance and admins manage reconciliations" ON public.finance_reconciliations
FOR ALL TO authenticated
USING (public.is_current_user_admin_by_role() OR public.user_has_permission('Finance'))
WITH CHECK (public.is_current_user_admin_by_role() OR public.user_has_permission('Finance'));

CREATE POLICY "Finance and admins manage reconciliation items" ON public.finance_reconciliation_items
FOR ALL TO authenticated
USING (public.is_current_user_admin_by_role() OR public.user_has_permission('Finance'))
WITH CHECK (public.is_current_user_admin_by_role() OR public.user_has_permission('Finance'));

-- 8. supplier_ledger_entries / supplier_payment_allocations / supplier_statement_prints policies
CREATE POLICY "Finance and admins manage supplier ledger" ON public.supplier_ledger_entries
FOR ALL TO authenticated
USING (public.is_current_user_admin_by_role() OR public.user_has_permission('Finance') OR public.user_has_permission('Procurement'))
WITH CHECK (public.is_current_user_admin_by_role() OR public.user_has_permission('Finance') OR public.user_has_permission('Procurement'));

CREATE POLICY "Finance and admins manage supplier payment allocations" ON public.supplier_payment_allocations
FOR ALL TO authenticated
USING (public.is_current_user_admin_by_role() OR public.user_has_permission('Finance') OR public.user_has_permission('Procurement'))
WITH CHECK (public.is_current_user_admin_by_role() OR public.user_has_permission('Finance') OR public.user_has_permission('Procurement'));

CREATE POLICY "Finance and admins manage supplier statement prints" ON public.supplier_statement_prints
FOR ALL TO authenticated
USING (public.is_current_user_admin_by_role() OR public.user_has_permission('Finance') OR public.user_has_permission('Procurement'))
WITH CHECK (public.is_current_user_admin_by_role() OR public.user_has_permission('Finance') OR public.user_has_permission('Procurement'));

-- 9. Verification code tables: revoke all client access; server-side (service_role) only
REVOKE ALL ON public.email_verification_codes FROM anon, authenticated;
REVOKE ALL ON public.login_verification_codes FROM anon, authenticated;
REVOKE ALL ON public.verification_codes FROM anon, authenticated;
REVOKE ALL ON public.withdrawal_verification_codes FROM anon, authenticated;
GRANT ALL ON public.email_verification_codes TO service_role;
GRANT ALL ON public.login_verification_codes TO service_role;
GRANT ALL ON public.verification_codes TO service_role;
GRANT ALL ON public.withdrawal_verification_codes TO service_role;
