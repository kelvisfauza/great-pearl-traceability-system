
-- Reverse the monthly loyalty reset - delete the adjustment entries
DELETE FROM public.ledger_entries WHERE reference LIKE 'MONTHLY-RESET-FEB2026%';
