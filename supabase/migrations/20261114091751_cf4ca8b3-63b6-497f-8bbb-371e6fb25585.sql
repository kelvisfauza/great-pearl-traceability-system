
-- farmer_profiles: drop blanket update; managed by Field Ops/admin ALL policy
DROP POLICY IF EXISTS "Authenticated users can update farmer_profiles" ON public.farmer_profiles;
CREATE POLICY "Creators or field ops can update farmer_profiles" ON public.farmer_profiles
  FOR UPDATE TO authenticated
  USING (is_active_staff() AND (created_by::text = auth.uid()::text OR created_by::text = current_user_email() OR user_has_permission('Field Operations') OR is_current_user_admin()))
  WITH CHECK (is_active_staff() AND (created_by::text = auth.uid()::text OR created_by::text = current_user_email() OR user_has_permission('Field Operations') OR is_current_user_admin()));

-- quality_dispatch_analyses / quality_sampling_orders: active staff only
DROP POLICY IF EXISTS "Staff can view dispatch analyses" ON public.quality_dispatch_analyses;
CREATE POLICY "Staff can view dispatch analyses" ON public.quality_dispatch_analyses
  FOR SELECT TO authenticated USING (is_active_staff());
DROP POLICY IF EXISTS "Staff can view sampling orders" ON public.quality_sampling_orders;
CREATE POLICY "Staff can view sampling orders" ON public.quality_sampling_orders
  FOR SELECT TO authenticated USING (is_active_staff());

-- fuel_vouchers
DROP POLICY IF EXISTS "Authenticated can view fuel vouchers" ON public.fuel_vouchers;
CREATE POLICY "Staff can view fuel vouchers" ON public.fuel_vouchers
  FOR SELECT TO authenticated USING (is_active_staff());
DROP POLICY IF EXISTS "Authenticated can issue fuel vouchers" ON public.fuel_vouchers;
CREATE POLICY "Staff can issue fuel vouchers" ON public.fuel_vouchers
  FOR INSERT TO authenticated WITH CHECK (is_active_staff());
DROP POLICY IF EXISTS "Authenticated can update fuel vouchers" ON public.fuel_vouchers;
CREATE POLICY "Staff can update fuel vouchers" ON public.fuel_vouchers
  FOR UPDATE TO authenticated USING (is_active_staff()) WITH CHECK (is_active_staff());

-- grn_pay_codes
DROP POLICY IF EXISTS "Authenticated can read grn pay codes" ON public.grn_pay_codes;
CREATE POLICY "Staff can read grn pay codes" ON public.grn_pay_codes
  FOR SELECT TO authenticated USING (is_active_staff());
DROP POLICY IF EXISTS "Authenticated can create grn pay codes" ON public.grn_pay_codes;
CREATE POLICY "Staff can create grn pay codes" ON public.grn_pay_codes
  FOR INSERT TO authenticated WITH CHECK (is_active_staff());

-- payment_receipt_prints
DROP POLICY IF EXISTS "Authenticated can view receipt prints" ON public.payment_receipt_prints;
CREATE POLICY "Staff can view receipt prints" ON public.payment_receipt_prints
  FOR SELECT TO authenticated USING (is_active_staff());
DROP POLICY IF EXISTS "Authenticated can record receipt prints" ON public.payment_receipt_prints;
CREATE POLICY "Staff can record receipt prints" ON public.payment_receipt_prints
  FOR INSERT TO authenticated WITH CHECK (is_active_staff());
DROP POLICY IF EXISTS "Authenticated can update receipt prints" ON public.payment_receipt_prints;
CREATE POLICY "Staff can update receipt prints" ON public.payment_receipt_prints
  FOR UPDATE TO authenticated USING (is_active_staff()) WITH CHECK (is_active_staff());

-- grn_print_log
DROP POLICY IF EXISTS "Authenticated can read grn print log" ON public.grn_print_log;
CREATE POLICY "Staff can read grn print log" ON public.grn_print_log
  FOR SELECT TO authenticated USING (is_active_staff());
DROP POLICY IF EXISTS "Authenticated can record grn prints" ON public.grn_print_log;
CREATE POLICY "Staff can record grn prints" ON public.grn_print_log
  FOR INSERT TO authenticated WITH CHECK (is_active_staff());
DROP POLICY IF EXISTS "Authenticated can update grn prints" ON public.grn_print_log;
CREATE POLICY "Staff can update grn prints" ON public.grn_print_log
  FOR UPDATE TO authenticated USING (is_active_staff()) WITH CHECK (is_active_staff());

-- provider_submission_requests: open form, but only fresh pending requests
DROP POLICY IF EXISTS "Anyone can submit a provider request" ON public.provider_submission_requests;
CREATE POLICY "Anyone can submit a pending provider request" ON public.provider_submission_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND reviewed_by IS NULL AND reviewed_at IS NULL AND reviewed_by_name IS NULL
    AND payout_record_id IS NULL AND payout_status IS NULL AND payout_message IS NULL
    AND admin_approved_amount IS NULL AND admin_approved_charge IS NULL
    AND admin_approved_by_name IS NULL AND finance_released_by_name IS NULL
    AND rejection_reason IS NULL
    AND amount IS NOT NULL AND amount > 0 AND amount <= 50000000
    AND length(coalesce(provider_name,'')) BETWEEN 2 AND 200
    AND (submitted_by IS NULL OR submitted_by = auth.uid())
  );
