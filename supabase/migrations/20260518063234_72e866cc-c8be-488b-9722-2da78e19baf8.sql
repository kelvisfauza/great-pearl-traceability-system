-- Reverse the May 17 airtime/data allowance "reversal" deductions that surprised users on Sunday.
-- These adjustments removed UGX 1,140,000 across 16 users with no prior notice.
-- We credit each affected user back the exact amount, with a UNDO- prefixed reference for traceability.
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT
  user_id,
  'ADJUSTMENT' as entry_type,
  -amount as amount,  -- flip sign: negative reversal becomes positive credit
  'UNDO-' || reference as reference,
  jsonb_build_object(
    'description', 'Restored balance: reverted Sunday May 17 airtime/data allowance clawback',
    'reason', 'sunday_clawback_rolled_back_user_complaints',
    'original_reversal_id', id,
    'original_reference', reference,
    'bypass_treasury_check', true
  ) as metadata,
  now() as created_at
FROM public.ledger_entries
WHERE reference LIKE 'AIRTIME-DATA-REVERSAL-%'
  AND created_at >= '2026-05-17'
  AND created_at < '2026-05-18'
  AND NOT EXISTS (
    SELECT 1 FROM public.ledger_entries le2
    WHERE le2.reference = 'UNDO-' || public.ledger_entries.reference
  );