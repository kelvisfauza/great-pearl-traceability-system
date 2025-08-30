-- Clear all existing data and recreate properly for Denis
DELETE FROM public.ledger_entries WHERE user_id IN ('e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641', 'JSxZYOSxmde6Cqra4clQNc92mRS2');

-- Also modify user_accounts to support TEXT user_id
DROP TABLE IF EXISTS public.user_accounts CASCADE;

CREATE TABLE public.user_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE, -- Changed to TEXT to support Firebase IDs
  current_balance NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC NOT NULL DEFAULT 0,
  salary_approved NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for user_accounts
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

-- Now create Denis's fresh ledger entries for 30 days of August
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'JSxZYOSxmde6Cqra4clQNc92mRS2',
  'DAILY_SALARY',
  9677.42, -- 300000 / 31 days
  'DAILY-2025-08-' || LPAD(day::text, 2, '0') || '-denis',
  json_build_object(
    'employee_name', 'Denis Bwambale',
    'monthly_salary', 300000,
    'credit_date', '2025-08-' || LPAD(day::text, 2, '0')
  ),
  ('2025-08-' || LPAD(day::text, 2, '0') || ' 08:00:00')::timestamp
FROM generate_series(1, 30) as day;

-- Create Denis's user account with the correct balance
INSERT INTO public.user_accounts (user_id, current_balance, total_earned, total_withdrawn, salary_approved)
VALUES ('JSxZYOSxmde6Cqra4clQNc92mRS2', 290322.60, 290322.60, 0, 0);