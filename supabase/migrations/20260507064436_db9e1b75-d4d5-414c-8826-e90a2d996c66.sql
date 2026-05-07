
-- 1. Backfill: hash any plaintext PINs
UPDATE public.admin_initiated_withdrawals
SET pin_code = crypt(pin_code, gen_salt('bf'))
WHERE pin_code IS NOT NULL AND pin_code !~ '^\$2[aby]\$';

-- 2. Vehicles
DROP POLICY IF EXISTS "Anyone can view vehicles" ON public.vehicles;
CREATE POLICY "Authenticated users can view vehicles"
ON public.vehicles FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 3. Rejected coffee
DROP POLICY IF EXISTS "Anyone can view rejected_coffee" ON public.rejected_coffee;
CREATE POLICY "Operations can view rejected_coffee"
ON public.rejected_coffee FOR SELECT TO authenticated
USING (
  user_has_permission('Field Operations')
  OR user_has_permission('Quality Control')
  OR user_has_permission('Finance')
  OR is_current_user_admin()
);

-- 4. Coffee records
DROP POLICY IF EXISTS "Public can view coffee records for display" ON public.coffee_records;

-- 5. Contract approvals
DROP POLICY IF EXISTS "Anyone can view contract approvals" ON public.contract_approvals;
CREATE POLICY "Operations can view contract approvals"
ON public.contract_approvals FOR SELECT TO authenticated
USING (
  user_has_permission('Sales Marketing')
  OR user_has_permission('Sales')
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR is_current_user_admin()
);

-- 6. Shipments
DROP POLICY IF EXISTS "Anyone can view shipments" ON public.shipments;
CREATE POLICY "Operations can view shipments"
ON public.shipments FOR SELECT TO authenticated
USING (
  user_has_permission('Sales Marketing')
  OR user_has_permission('Sales')
  OR user_has_permission('Logistics')
  OR user_has_permission('Finance')
  OR is_current_user_admin()
);

-- 7. Finance expenses
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Authenticated users can manage finance expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "auth read" ON public.finance_expenses;
DROP POLICY IF EXISTS "auth update" ON public.finance_expenses;
DROP POLICY IF EXISTS "auth write" ON public.finance_expenses;

CREATE POLICY "Finance can view expenses"
ON public.finance_expenses FOR SELECT TO authenticated
USING (user_has_permission('Finance') OR is_current_user_admin());

CREATE POLICY "Finance can insert expenses"
ON public.finance_expenses FOR INSERT TO authenticated
WITH CHECK (user_has_permission('Finance') OR is_current_user_admin());

CREATE POLICY "Finance can update expenses"
ON public.finance_expenses FOR UPDATE TO authenticated
USING (user_has_permission('Finance') OR is_current_user_admin())
WITH CHECK (user_has_permission('Finance') OR is_current_user_admin());

-- 8. USSD advance requests (no employee_email column; restrict to admins/Finance/HR)
DROP POLICY IF EXISTS "Admins can view ussd advance requests" ON public.ussd_advance_requests;
CREATE POLICY "Admins/Finance view ussd advance requests"
ON public.ussd_advance_requests FOR SELECT TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Finance')
  OR user_has_permission('Human Resources')
);

-- 9. USSD payment logs
DROP POLICY IF EXISTS "Authenticated users can read logs" ON public.ussd_payment_logs;
CREATE POLICY "Finance and admins can read ussd payment logs"
ON public.ussd_payment_logs FOR SELECT TO authenticated
USING (is_current_user_admin() OR user_has_permission('Finance'));

-- 10. Milling tables
DROP POLICY IF EXISTS "Anyone can manage milling_customers" ON public.milling_customers;
DROP POLICY IF EXISTS "Anyone can manage milling_cash_transactions" ON public.milling_cash_transactions;
DROP POLICY IF EXISTS "Anyone can manage milling_transactions" ON public.milling_transactions;
DROP POLICY IF EXISTS "Authenticated users can manage milling jobs" ON public.milling_jobs;

CREATE POLICY "Milling operations can manage cash transactions"
ON public.milling_cash_transactions FOR ALL TO authenticated
USING (user_has_permission('Milling Operations') OR user_has_permission('Finance') OR is_current_user_admin())
WITH CHECK (user_has_permission('Milling Operations') OR user_has_permission('Finance') OR is_current_user_admin());

CREATE POLICY "Milling operations can manage milling jobs"
ON public.milling_jobs FOR ALL TO authenticated
USING (user_has_permission('Milling Operations') OR is_current_user_admin())
WITH CHECK (user_has_permission('Milling Operations') OR is_current_user_admin());
