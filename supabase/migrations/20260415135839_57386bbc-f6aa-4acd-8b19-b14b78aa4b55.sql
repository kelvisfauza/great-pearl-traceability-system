UPDATE public.ledger_entries 
SET entry_type = 'DEPOSIT'
WHERE reference LIKE 'LOAN-BALANCE-UNCOLLECTED-%' 
AND user_id = 'ff2f07a4-ef00-4f1c-9316-498ddfd38038'
AND entry_type = 'credit';