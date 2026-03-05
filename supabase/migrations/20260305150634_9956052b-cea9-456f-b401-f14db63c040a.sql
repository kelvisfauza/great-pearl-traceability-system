
-- Fix Fauza's wallet loan repayment: change entry_type from LOAN_REPAYMENT to WITHDRAWAL
-- so it properly affects the wallet balance
UPDATE public.ledger_entries
SET entry_type = 'WITHDRAWAL'
WHERE reference = 'LOAN-REPAY-e590c91f-8e7b-477d-b281-c44abe0295d4-1772723032357'
AND entry_type = 'LOAN_REPAYMENT';
