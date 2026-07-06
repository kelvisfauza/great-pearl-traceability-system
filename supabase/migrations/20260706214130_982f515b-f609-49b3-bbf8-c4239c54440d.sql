
-- 1. announcements: only HR/Admin can create
DROP POLICY IF EXISTS "Authenticated users can create announcements" ON public.announcements;
CREATE POLICY "HR and admins can create announcements"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_current_user_admin()
    OR user_has_permission('Human Resources'::text)
    OR user_has_permission('HR Manager'::text)
  );

-- 2. instant_withdrawals: only service_role (edge functions) can insert/update
DROP POLICY IF EXISTS "System can insert instant withdrawals" ON public.instant_withdrawals;
DROP POLICY IF EXISTS "System can update instant withdrawals" ON public.instant_withdrawals;

-- 3. investments: only service_role or admin can update
DROP POLICY IF EXISTS "Service role can update investments" ON public.investments;
CREATE POLICY "Admins can update investments"
  ON public.investments
  FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- 4. ledger_entries: only service_role (edge functions) or finance (existing ALL policy) can insert
DROP POLICY IF EXISTS "System can insert ledger entries" ON public.ledger_entries;

-- 5. milling_momo_transactions: only service_role can update
DROP POLICY IF EXISTS "Service role can update milling momo transactions" ON public.milling_momo_transactions;

-- 6. mobile_money_transactions: only service_role can update
DROP POLICY IF EXISTS "Service role can update transactions" ON public.mobile_money_transactions;

-- 7. transfer_reversal_requests: sender must match their own email
DROP POLICY IF EXISTS "System insert reversal requests" ON public.transfer_reversal_requests;
CREATE POLICY "Senders can create own reversal requests"
  ON public.transfer_reversal_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_email = (
      SELECT e.email FROM public.employees e WHERE e.auth_user_id = auth.uid() LIMIT 1
    )
  );
