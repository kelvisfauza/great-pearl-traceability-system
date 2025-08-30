-- Change user_id in ledger_entries from UUID to TEXT to support Firebase IDs
ALTER TABLE public.ledger_entries ALTER COLUMN user_id TYPE TEXT;

-- Change user_id in withdrawal_requests from UUID to TEXT
ALTER TABLE public.withdrawal_requests ALTER COLUMN user_id TYPE TEXT;

-- Change user_id in user_accounts from UUID to TEXT  
ALTER TABLE public.user_accounts ALTER COLUMN user_id TYPE TEXT;

-- Change user_id in user_activity from UUID to TEXT
ALTER TABLE public.user_activity ALTER COLUMN user_id TYPE TEXT;