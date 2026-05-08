
UPDATE public.ledger_entries
SET amount = -10000,
    updated_at = now()
WHERE reference = 'LOAN-CLAWBACK-0b320e54-289e-4893-ac58-6013cf95bd9c'
  AND entry_type = 'WITHDRAWAL';
