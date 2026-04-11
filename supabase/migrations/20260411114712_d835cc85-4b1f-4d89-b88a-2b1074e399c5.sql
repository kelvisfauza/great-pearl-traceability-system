INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
VALUES (
  'e4c10711-43e4-4901-9b2a-6f2a5a836240',
  'DEPOSIT',
  60000,
  'REFUND-UNDISBURSED-1ed01696',
  'SYSTEM_AWARD',
  jsonb_build_object(
    'description', 'Refund for undisbursed withdrawal of UGX 60,000 (original ref: LOANREPAY-WALLET-1ed01696-1774864699157)',
    'reason', 'Withdrawal was approved but funds were never disbursed to employee',
    'refunded_by', 'admin',
    'original_withdrawal_date', '2026-03-30',
    'original_amount', 60000
  )
);