-- Clear all finance cash transactions and start fresh
DELETE FROM public.finance_cash_transactions WHERE true;

-- Reset the balance to zero with no negative adjustments
-- This allows the system to properly track advances when needed
COMMENT ON TABLE public.finance_cash_transactions IS 'Finance cash tracking - reset to zero balance for fresh start with real data';