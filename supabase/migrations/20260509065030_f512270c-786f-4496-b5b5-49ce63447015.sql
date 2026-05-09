
-- 1. Attendance: restrict insert/update to HR or Admin
DROP POLICY IF EXISTS "Admins can insert attendance" ON public.attendance;
CREATE POLICY "HR or Admins can insert attendance"
ON public.attendance FOR INSERT TO authenticated
WITH CHECK (user_has_permission('Human Resources') OR is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update unlocked attendance only" ON public.attendance;
CREATE POLICY "HR or Admins can update unlocked attendance"
ON public.attendance FOR UPDATE TO authenticated
USING (((is_locked = false) OR (is_locked IS NULL)) AND (user_has_permission('Human Resources') OR is_current_user_admin()))
WITH CHECK (user_has_permission('Human Resources') OR is_current_user_admin());

-- 2. user_fraud_locks: only allow self-insert
DROP POLICY IF EXISTS "Authenticated users can insert fraud locks" ON public.user_fraud_locks;
CREATE POLICY "Users can insert own fraud locks"
ON public.user_fraud_locks FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR is_current_user_admin());

-- 3. gosentepay_balance + log: restrict to Finance/Admin
DROP POLICY IF EXISTS "Authenticated users can manage balance" ON public.gosentepay_balance;
DROP POLICY IF EXISTS "Authenticated users can read balance" ON public.gosentepay_balance;
CREATE POLICY "Finance or admins can read balance"
ON public.gosentepay_balance FOR SELECT TO authenticated
USING (user_has_permission('Finance') OR is_current_user_admin());
CREATE POLICY "Finance or admins can manage balance"
ON public.gosentepay_balance FOR ALL TO authenticated
USING (user_has_permission('Finance') OR is_current_user_admin())
WITH CHECK (user_has_permission('Finance') OR is_current_user_admin());

DROP POLICY IF EXISTS "Authenticated users can read balance log" ON public.gosentepay_balance_log;
DROP POLICY IF EXISTS "Authenticated users can insert balance log" ON public.gosentepay_balance_log;
CREATE POLICY "Finance or admins can read balance log"
ON public.gosentepay_balance_log FOR SELECT TO authenticated
USING (user_has_permission('Finance') OR is_current_user_admin());
CREATE POLICY "Finance or admins can insert balance log"
ON public.gosentepay_balance_log FOR INSERT TO authenticated
WITH CHECK (user_has_permission('Finance') OR is_current_user_admin());

-- 4. Realtime safe-topics: block additional sensitive topics
DROP POLICY IF EXISTS "realtime_authenticated_safe_topics" ON realtime.messages;
CREATE POLICY "realtime_authenticated_safe_topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  (auth.uid() IS NOT NULL)
  AND (realtime.topic() !~* '^(employees|admin_initiated_withdrawals|mobile_money_transactions|system_errors|salary|withdrawal|finance|payroll|verification|otp|pin|ussd_payment_logs|deletion_requests|overtime_awards|gosentepay)')
);
