
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
SELECT
  iw.user_id,
  'WITHDRAWAL',
  -iw.amount,
  COALESCE(iw.ledger_reference, 'INSTANT-WD-' || iw.id::text),
  'WITHDRAWAL',
  jsonb_build_object(
    'type','instant_withdrawal',
    'instant_withdrawal_id', iw.id,
    'phone', iw.phone_number,
    'payout_ref', iw.payout_ref,
    'description', 'Instant withdrawal — UGX ' || iw.amount || ' to ' || iw.phone_number || ' (backfill)',
    'bypass_treasury_check', true,
    'backfill', true,
    'backfill_reason', 'Yo payout succeeded but ledger debit was never written'
  )
FROM public.instant_withdrawals iw
WHERE iw.id IN (
  'd7942b3e-9d95-4630-8fbb-9d8969c43317',
  'cffe1055-7963-40b7-a408-826f6edb4d12',
  'a7bbd3fc-4899-4ef8-b70d-646290c063bf',
  '6cdebe73-bc19-4e40-b833-198b83323625',
  '61f5a812-7b93-4ce0-b234-fc45c2f867e4'
)
AND NOT EXISTS (
  SELECT 1 FROM public.ledger_entries le
  WHERE le.reference = COALESCE(iw.ledger_reference, 'INSTANT-WD-' || iw.id::text)
);
