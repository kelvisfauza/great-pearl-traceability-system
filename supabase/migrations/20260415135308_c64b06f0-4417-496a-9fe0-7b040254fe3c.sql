INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
VALUES (
  'ff2f07a4-ef00-4f1c-9316-498ddfd38038',
  'credit',
  300000,
  'LOAN-BALANCE-UNCOLLECTED-' || gen_random_uuid(),
  'LOAN_DISBURSEMENT',
  jsonb_build_object(
    'description', 'Balance for loan uncollected - UGX 300,000 of approved UGX 500,000 loan',
    'loan_id', '6a300939-1a66-4565-b62f-56a4ab149760',
    'employee_name', 'Mukobi Godwin',
    'employee_email', 'godwinmukobi@greatpearlcoffee.com',
    'credited_by', 'Admin - Manual Credit',
    'reason', 'Only UGX 200,000 was paid out from approved UGX 500,000 loan. Crediting remaining UGX 300,000 to wallet.'
  )
);