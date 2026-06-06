
-- Reverse the duplicate overdraft recovery ledger entry for user 00b188fc-73fe-4ee7-9fe9-956ab2faa6ec.
-- The wallet had already absorbed the overdraft when the +1.1M deposit landed
-- (wallet went from -149,525.333 to +950,547.667), so the additional recovery debit was a double-charge.
INSERT INTO public.ledger_entries (user_id, entry_type, amount, source_category, reference, metadata, created_at)
VALUES (
  '00b188fc-73fe-4ee7-9fe9-956ab2faa6ec',
  'REVERSAL',
  149525.33,
  'OVERDRAFT_RECOVERY',
  'OD-REC-REVERSAL-20260606',
  jsonb_build_object(
    'description', 'Reversal of duplicate overdraft recovery — wallet had already absorbed the overdraft on the incoming credit',
    'type', 'overdraft_recovery_reversal',
    'reverses_reference', 'OD-REC-CONSOLIDATED-00b188fc-73fe-4ee7-9fe9-956ab2faa6ec-20260606',
    'bypass_treasury_check', true
  ),
  now()
);
