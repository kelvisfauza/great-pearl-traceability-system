-- First, create the ledger_entries table if it doesn't exist or recreate it properly
DROP TABLE IF EXISTS public.ledger_entries CASCADE;

CREATE TABLE public.ledger_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Changed to TEXT to support Firebase IDs
  entry_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own entries
CREATE POLICY "Users can view their own ledger entries"
ON public.ledger_entries
FOR SELECT
USING (user_id = auth.uid()::text OR user_id = 'JSxZYOSxmde6Cqra4clQNc92mRS2');

-- Create policy for system to insert entries
CREATE POLICY "System can insert ledger entries"
ON public.ledger_entries
FOR INSERT
WITH CHECK (true);

-- Now create Denis's ledger entries with his Firebase ID
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'JSxZYOSxmde6Cqra4clQNc92mRS2',
  'DAILY_SALARY',
  9677.42, -- 300000 / 31 days
  'DAILY-2025-08-' || LPAD(generate_series(1, 30)::text, 2, '0') || '-denis',
  json_build_object(
    'employee_name', 'Denis Bwambale',
    'monthly_salary', 300000,
    'credit_date', '2025-08-' || LPAD(generate_series(1, 30)::text, 2, '0')
  ),
  ('2025-08-' || LPAD(generate_series(1, 30)::text, 2, '0') || ' 08:00:00')::timestamp
FROM generate_series(1, 30);