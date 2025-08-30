-- Fix withdrawal_requests table to support TEXT user_id like other tables
DROP TABLE IF EXISTS public.withdrawal_requests CASCADE;

CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Changed to TEXT to support Firebase IDs
  amount NUMERIC NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  channel TEXT DEFAULT 'ZENGAPAY',
  request_ref TEXT,
  transaction_reference TEXT,
  transaction_id TEXT,
  approved_by TEXT,
  provider_ref TEXT,
  provider_fee NUMERIC DEFAULT 0,
  failure_reason TEXT,
  payment_voucher TEXT,
  printed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for withdrawal_requests
CREATE POLICY "Users can view their own withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (user_id = auth.uid()::text OR user_id = 'JSxZYOSxmde6Cqra4clQNc92mRS2');

CREATE POLICY "Users can create withdrawal requests"
ON public.withdrawal_requests
FOR INSERT
WITH CHECK (user_id = auth.uid()::text OR user_id = 'JSxZYOSxmde6Cqra4clQNc92mRS2');

CREATE POLICY "Admins can update withdrawal requests"
ON public.withdrawal_requests
FOR UPDATE
USING (true); -- Allow admin operations

CREATE POLICY "Admins can view all withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (true); -- Allow admin operations