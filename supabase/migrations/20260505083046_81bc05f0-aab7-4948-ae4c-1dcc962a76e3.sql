
-- =========================================================
-- VERIFICATION CODES (plaintext OTPs)
-- =========================================================
DROP POLICY IF EXISTS "Service role can manage verification codes" ON public.verification_codes;
CREATE POLICY "Admins can view verification codes"
  ON public.verification_codes FOR SELECT TO authenticated
  USING (public.is_current_user_admin());
CREATE POLICY "Authenticated can insert verification codes"
  ON public.verification_codes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update verification codes"
  ON public.verification_codes FOR UPDATE TO authenticated
  USING (public.is_current_user_admin());
CREATE POLICY "Admins can delete verification codes"
  ON public.verification_codes FOR DELETE TO authenticated
  USING (public.is_current_user_admin());

-- =========================================================
-- EMAIL VERIFICATION CODES
-- =========================================================
DROP POLICY IF EXISTS "Users can view their own verification codes" ON public.email_verification_codes;
CREATE POLICY "Users can view their own email verification codes"
  ON public.email_verification_codes FOR SELECT TO authenticated
  USING (
    email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
    OR public.is_current_user_admin()
  );

-- =========================================================
-- SMS FAILURES (plaintext codes)
-- =========================================================
DROP POLICY IF EXISTS "IT can view all SMS failures" ON public.sms_failures;
DROP POLICY IF EXISTS "System can insert SMS failures" ON public.sms_failures;
CREATE POLICY "Admins/IT can view sms failures"
  ON public.sms_failures FOR SELECT TO authenticated
  USING (
    public.is_current_user_admin()
    OR public.user_has_permission('IT Management')
  );
CREATE POLICY "Authenticated can insert sms failures"
  ON public.sms_failures FOR INSERT TO authenticated WITH CHECK (true);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can create notifications" ON public.notifications;

CREATE POLICY "Users view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    target_user_id = auth.uid()
    OR target_user_id IS NULL
    OR public.is_current_user_admin()
  );
CREATE POLICY "Authenticated can create notifications"
  ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    target_user_id = auth.uid()
    OR public.is_current_user_admin()
  );

-- =========================================================
-- SALARY AUTO INVEST
-- =========================================================
DROP POLICY IF EXISTS "Service role full access" ON public.salary_auto_invest;
CREATE POLICY "Admins manage salary auto-invest"
  ON public.salary_auto_invest FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- =========================================================
-- USER PRESENCE
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view user presence" ON public.user_presence;
CREATE POLICY "Authenticated users view user presence"
  ON public.user_presence FOR SELECT TO authenticated USING (true);

-- =========================================================
-- SYSTEM ERRORS
-- =========================================================
DROP POLICY IF EXISTS "IT staff can view all errors" ON public.system_errors;
DROP POLICY IF EXISTS "IT staff can update errors" ON public.system_errors;
DROP POLICY IF EXISTS "Anyone can report errors" ON public.system_errors;

CREATE POLICY "Admins/IT view system errors"
  ON public.system_errors FOR SELECT TO authenticated
  USING (
    public.is_current_user_admin()
    OR public.user_has_permission('IT Management')
  );
CREATE POLICY "Admins/IT update system errors"
  ON public.system_errors FOR UPDATE TO authenticated
  USING (
    public.is_current_user_admin()
    OR public.user_has_permission('IT Management')
  );
CREATE POLICY "Authenticated can insert system errors"
  ON public.system_errors FOR INSERT TO authenticated WITH CHECK (true);

-- =========================================================
-- ADMIN INITIATED WITHDRAWALS (pin codes!)
-- =========================================================
DROP POLICY IF EXISTS "Admins full access on admin_initiated_withdrawals" ON public.admin_initiated_withdrawals;
CREATE POLICY "Admins/Finance manage admin_initiated_withdrawals"
  ON public.admin_initiated_withdrawals FOR ALL TO authenticated
  USING (
    public.is_current_user_admin()
    OR public.user_has_permission('Finance')
  )
  WITH CHECK (
    public.is_current_user_admin()
    OR public.user_has_permission('Finance')
  );

-- =========================================================
-- DELETION REQUESTS
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view deletion requests" ON public.deletion_requests;
CREATE POLICY "Requester or admin/finance view deletion requests"
  ON public.deletion_requests FOR SELECT TO authenticated
  USING (
    requested_by = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())::text
    OR public.is_current_user_admin()
    OR public.user_has_permission('Finance')
  );

-- =========================================================
-- SUPPLIER CONTRACTS
-- =========================================================
DROP POLICY IF EXISTS "Anyone can insert supplier contracts" ON public.supplier_contracts;
DROP POLICY IF EXISTS "Anyone can update supplier contracts" ON public.supplier_contracts;
DROP POLICY IF EXISTS "Anyone can view supplier contracts" ON public.supplier_contracts;

CREATE POLICY "Authenticated view supplier contracts"
  ON public.supplier_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Procurement/Admin insert supplier contracts"
  ON public.supplier_contracts FOR INSERT TO authenticated
  WITH CHECK (
    public.is_current_user_admin()
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('Finance')
  );
CREATE POLICY "Procurement/Admin update supplier contracts"
  ON public.supplier_contracts FOR UPDATE TO authenticated
  USING (
    public.is_current_user_admin()
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('Finance')
  );

-- =========================================================
-- SMS LOGS
-- =========================================================
DROP POLICY IF EXISTS "sms_logs_update_policy" ON public.sms_logs;
DROP POLICY IF EXISTS "sms_logs_insert_policy" ON public.sms_logs;

CREATE POLICY "Authenticated insert sms_logs"
  ON public.sms_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins update sms_logs"
  ON public.sms_logs FOR UPDATE TO authenticated
  USING (
    public.is_current_user_admin()
    OR public.user_has_permission('IT Management')
  );

-- =========================================================
-- LEDGER ENTRIES — remove hardcoded legacy ID
-- =========================================================
DROP POLICY IF EXISTS "Users can view their own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can view their own ledger entries"
  ON public.ledger_entries FOR SELECT TO authenticated
  USING (user_id = (auth.uid())::text);

-- =========================================================
-- USER ACCOUNTS — remove hardcoded legacy ID
-- =========================================================
DROP POLICY IF EXISTS "Users can view their own account" ON public.user_accounts;
DROP POLICY IF EXISTS "Users can update their own account" ON public.user_accounts;
CREATE POLICY "Users can view their own account"
  ON public.user_accounts FOR SELECT TO authenticated
  USING (user_id = (auth.uid())::text);
CREATE POLICY "Users can update their own account"
  ON public.user_accounts FOR UPDATE TO authenticated
  USING (user_id = (auth.uid())::text);

-- =========================================================
-- STORAGE BUCKETS — make private
-- =========================================================
UPDATE storage.buckets SET public = false WHERE id IN ('loan-documents','statements');
