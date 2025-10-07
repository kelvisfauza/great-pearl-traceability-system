-- Clear finance_cash_balance table for fresh start with real data
DELETE FROM public.finance_cash_balance WHERE true;

COMMENT ON TABLE public.finance_cash_balance IS 'Finance cash balance tracking - cleared for fresh start with real transactions';