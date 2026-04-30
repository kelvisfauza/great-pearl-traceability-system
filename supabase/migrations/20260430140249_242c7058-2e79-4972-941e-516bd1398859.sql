-- Enable realtime broadcasts for payment tracking
ALTER TABLE public.mobile_money_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.ussd_payment_logs REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mobile_money_transactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ussd_payment_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;