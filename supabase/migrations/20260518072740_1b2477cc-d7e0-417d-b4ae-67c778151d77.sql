INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
SELECT
  '1922048f-c0b9-422e-9b42-47713a75c1ca',
  'ADJUSTMENT',
  -42000,
  'REVERSE-UNDO-DUPLICATE-INSTANT-WD-d7942b3e-9d95-4630-8fbb-9d8969c43317',
  'SYSTEM_AWARD',
  jsonb_build_object(
    'bypass_treasury_check', true,
    'type', 'internal_correction',
    'description', 'Reversal of incorrect +42,000 refund. The May 16 12:49 backfill was legitimate — it caught up on John''s May 9 successful disbursement (instant_withdrawals.d7942b3e completed 2026-05-09 07:02) that had never been deducted from the ledger.',
    'reverses_reference', 'UNDO-DUPLICATE-INSTANT-WD-d7942b3e-9d95-4630-8fbb-9d8969c43317'
  )
WHERE NOT EXISTS (
  SELECT 1 FROM public.ledger_entries
  WHERE reference = 'REVERSE-UNDO-DUPLICATE-INSTANT-WD-d7942b3e-9d95-4630-8fbb-9d8969c43317'
);