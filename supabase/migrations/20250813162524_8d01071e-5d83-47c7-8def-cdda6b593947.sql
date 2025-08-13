-- Enable real-time updates for milling tables
ALTER TABLE public.milling_customers REPLICA IDENTITY FULL;
ALTER TABLE public.milling_cash_transactions REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication for real-time functionality
ALTER PUBLICATION supabase_realtime ADD TABLE public.milling_customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.milling_cash_transactions;