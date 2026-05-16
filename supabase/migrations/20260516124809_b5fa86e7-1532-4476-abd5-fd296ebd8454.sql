
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
SELECT
  '1922048f-c0b9-422e-9b42-47713a75c1ca',
  'WITHDRAWAL',
  -51000,
  'INSTANT-WD-373d2e7b-efd1-442c-82ea-4a237f264941',
  'WITHDRAWAL',
  jsonb_build_object(
    'source','instant_withdrawal',
    'instant_withdrawal_id','373d2e7b-efd1-442c-82ea-4a237f264941',
    'payout_ref','INSTANT-WD-1778935000406',
    'phone','256785208473',
    'description','Instant withdrawal — UGX 51,000 to 256785208473',
    'bypass_treasury_check',true,
    'backfill',true,
    'backfill_reason','Yo payout succeeded but ledger debit was never written'
  )
WHERE NOT EXISTS (
  SELECT 1 FROM public.ledger_entries
  WHERE reference = 'INSTANT-WD-373d2e7b-efd1-442c-82ea-4a237f264941'
);
