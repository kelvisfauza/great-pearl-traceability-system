INSERT INTO public.ledger_entries (user_id, entry_type, amount, source_category, reference, metadata)
SELECT 
  '1922048f-c0b9-422e-9b42-47713a75c1ca'::uuid,
  'ADJUSTMENT',
  42000,
  'SYSTEM_AWARD',
  'UNDO-DUPLICATE-INSTANT-WD-d7942b3e-9d95-4630-8fbb-9d8969c43317',
  jsonb_build_object(
    'description', 'Refund of duplicate instant withdrawal entry — original 42,000 already deducted at 09:48 UTC May 16 (matches the 12:48 EAT pending email)',
    'undoes_reference', 'INSTANT-WD-d7942b3e-9d95-4630-8fbb-9d8969c43317',
    'reason', 'duplicate_backfill_entry'
  )
WHERE NOT EXISTS (
  SELECT 1 FROM public.ledger_entries 
  WHERE reference = 'UNDO-DUPLICATE-INSTANT-WD-d7942b3e-9d95-4630-8fbb-9d8969c43317'
);