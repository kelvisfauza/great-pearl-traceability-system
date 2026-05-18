DELETE FROM public.ledger_entries
WHERE reference LIKE 'FINAL-RECONCILE-EFFECTIVE-2026-05-18-%'
  AND COALESCE(metadata->>'type', '') = 'final_reconciliation_effective';