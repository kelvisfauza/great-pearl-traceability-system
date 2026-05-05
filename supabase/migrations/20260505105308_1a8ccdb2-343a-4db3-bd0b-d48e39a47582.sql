
ALTER VIEW public.pending_payments_aging SET (security_invoker = true);
ALTER VIEW public.supplier_balances SET (security_invoker = true);
ALTER VIEW public.supplier_payments_report SET (security_invoker = true);
ALTER VIEW public.daily_finance_summary SET (security_invoker = true);
ALTER VIEW public.withdrawal_requests SET (security_invoker = true);
ALTER VIEW public.finance_requisitions_dashboard SET (security_invoker = true);
ALTER VIEW public.requisition_statistics SET (security_invoker = true);
ALTER VIEW public.department_requisitions SET (security_invoker = true);

ALTER FUNCTION public.confirm_cash_transaction(uuid, text, text) SET search_path = public;

REVOKE ALL ON public.monthly_payment_summary FROM anon, authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='qr_access_pins') THEN
    CREATE POLICY "Admins manage qr_access_pins" ON public.qr_access_pins
      FOR ALL TO authenticated
      USING (public.is_current_user_administrator())
      WITH CHECK (public.is_current_user_administrator());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='qr_trusted_devices') THEN
    CREATE POLICY "Admins manage qr_trusted_devices" ON public.qr_trusted_devices
      FOR ALL TO authenticated
      USING (public.is_current_user_administrator())
      WITH CHECK (public.is_current_user_administrator());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='qr_access_otps') THEN
    CREATE POLICY "Admins manage qr_access_otps" ON public.qr_access_otps
      FOR ALL TO authenticated
      USING (public.is_current_user_administrator())
      WITH CHECK (public.is_current_user_administrator());
  END IF;
END $$;
