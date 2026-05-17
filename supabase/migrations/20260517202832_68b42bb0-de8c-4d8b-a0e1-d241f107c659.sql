INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
SELECT
  le.user_id,
  'ADJUSTMENT'::text,
  -le.amount,
  'AIRTIME-DATA-REVERSAL-' || le.id::text,
  'OTHER'::text,
  jsonb_build_object(
    'description', 'Reversal of phantom ' || (le.metadata->>'allowance_type') || ' DEPOSIT (direct Yo payout to phone, not wallet money)',
    'original_entry_id', le.id,
    'original_reference', le.reference,
    'original_month', le.metadata->>'month_year',
    'reason', 'airtime_data_allowance_double_credit_fix',
    'bypass_treasury_check', true
  )
FROM public.ledger_entries le
WHERE le.entry_type = 'DEPOSIT'
  AND le.metadata->>'allowance_type' IN ('airtime_allowance','data_allowance')
  AND NOT EXISTS (
    SELECT 1 FROM public.ledger_entries r
    WHERE r.reference = 'AIRTIME-DATA-REVERSAL-' || le.id::text
  );