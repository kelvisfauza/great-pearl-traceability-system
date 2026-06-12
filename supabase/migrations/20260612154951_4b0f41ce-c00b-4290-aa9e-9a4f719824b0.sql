
-- Restrict SELECT on milling_momo_transactions to milling/finance/admin
DROP POLICY IF EXISTS "Authenticated users can view milling momo transactions" ON public.milling_momo_transactions;
CREATE POLICY "Milling/Finance/Admin can view milling momo transactions"
  ON public.milling_momo_transactions
  FOR SELECT
  USING (user_has_milling_access() OR user_has_permission('Finance') OR is_current_user_admin());

-- Restrict SELECT on milling_transactions
DROP POLICY IF EXISTS "Authenticated can view milling transactions" ON public.milling_transactions;
CREATE POLICY "Milling/Finance/Admin can view milling transactions"
  ON public.milling_transactions
  FOR SELECT
  USING (user_has_milling_access() OR user_has_permission('Finance') OR is_current_user_admin());

-- Block 'milling' Realtime topics from generic authenticated subscribers
DROP POLICY IF EXISTS "realtime_authenticated_safe_topics" ON realtime.messages;
CREATE POLICY "realtime_authenticated_safe_topics"
  ON realtime.messages
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL)
    AND (realtime.topic() !~* '^(employees|admin_initiated_withdrawals|mobile_money_transactions|system_errors|system_console_logs|salary|withdrawal|finance|payroll|verification|otp|pin|ussd_payment_logs|deletion_requests|overtime_awards|gosentepay|milling)')
  );
