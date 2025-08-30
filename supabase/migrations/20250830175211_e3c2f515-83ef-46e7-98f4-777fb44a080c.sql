-- Drop and recreate all tables with proper TEXT user_id support
DROP TABLE IF EXISTS public.user_accounts CASCADE;
DROP TABLE IF EXISTS public.ledger_entries CASCADE;
DROP TABLE IF EXISTS public.withdrawal_requests CASCADE;

-- Create ledger_entries with TEXT user_id
CREATE TABLE public.ledger_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_accounts with TEXT user_id
CREATE TABLE public.user_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC NOT NULL DEFAULT 0,
  salary_approved NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create withdrawal_requests with TEXT user_id
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
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

-- Enable RLS on all tables
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ledger_entries
CREATE POLICY "Users can view their own ledger entries"
ON public.ledger_entries
FOR SELECT
USING (user_id = auth.uid()::text OR user_id = 'JSxZYOSxmde6Cqra4clQNc92mRS2');

CREATE POLICY "System can insert ledger entries"
ON public.ledger_entries
FOR INSERT
WITH CHECK (true);

-- Create RLS policies for user_accounts
CREATE POLICY "Users can view their own account"
ON public.user_accounts
FOR SELECT
USING (user_id = auth.uid()::text OR user_id = 'JSxZYOSxmde6Cqra4clQNc92mRS2');

CREATE POLICY "Users can update their own account"
ON public.user_accounts
FOR UPDATE
USING (user_id = auth.uid()::text OR user_id = 'JSxZYOSxmde6Cqra4clQNc92mRS2');

CREATE POLICY "System can insert user accounts"
ON public.user_accounts
FOR INSERT
WITH CHECK (true);

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
USING (true);

CREATE POLICY "Admins can view all withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (true);

-- Insert Denis's ledger entries with his Firebase ID
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'JSxZYOSxmde6Cqra4clQNc92mRS2',
  'DAILY_SALARY',
  9677.42, -- 300000 / 31 days
  'DAILY-2025-08-' || LPAD(day_num::text, 2, '0') || '-denis-firebase',
  json_build_object(
    'employee_name', 'Denis Bwambale',
    'monthly_salary', 300000,
    'credit_date', '2025-08-' || LPAD(day_num::text, 2, '0')
  ),
  ('2025-08-' || LPAD(day_num::text, 2, '0') || ' 08:00:00')::timestamp
FROM generate_series(1, 30) day_num;

-- Insert Denis's user account
INSERT INTO public.user_accounts (user_id, current_balance, total_earned)
VALUES ('JSxZYOSxmde6Cqra4clQNc92mRS2', 290322.60, 290322.60);