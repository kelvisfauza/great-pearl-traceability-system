
-- Clawback 10,000 UGX evaluation fee overpaid to John Masereka on loan 0b320e54-289e-4893-ac58-6013cf95bd9c
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
VALUES (
  '1922048f-c0b9-422e-9b42-47713a75c1ca',
  'WITHDRAWAL',
  10000,
  'LOAN-CLAWBACK-0b320e54-289e-4893-ac58-6013cf95bd9c',
  'LOAN_DISBURSEMENT',
  jsonb_build_object(
    'description', 'Clawback of 10,000 UGX evaluation fee overpaid on loan disbursement',
    'loan_id', '0b320e54-289e-4893-ac58-6013cf95bd9c',
    'bypass_treasury_check', true,
    'corrective_entry', true
  )
);

-- Reflect actual net disbursed amount on the loan record
UPDATE public.loans
SET disbursed_amount = 50000,
    original_loan_amount = 50000,
    updated_at = now()
WHERE id = '0b320e54-289e-4893-ac58-6013cf95bd9c';
