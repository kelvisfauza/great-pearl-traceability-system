-- Change user_id column in ledger_entries to TEXT to support Firebase IDs
ALTER TABLE public.ledger_entries ALTER COLUMN user_id TYPE TEXT;

-- Change user_id column in user_accounts to TEXT to support Firebase IDs  
ALTER TABLE public.user_accounts ALTER COLUMN user_id TYPE TEXT;

-- Change user_id column in withdrawal_requests to TEXT to support Firebase IDs
ALTER TABLE public.withdrawal_requests ALTER COLUMN user_id TYPE TEXT;

-- Change user_id column in user_activity to TEXT to support Firebase IDs
ALTER TABLE public.user_activity ALTER COLUMN user_id TYPE TEXT;