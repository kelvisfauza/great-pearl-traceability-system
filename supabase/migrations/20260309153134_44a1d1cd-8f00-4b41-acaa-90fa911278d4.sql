
-- Balance reconciliation: correct Tumwine Alex's wallet to verified 588,697 UGX
-- Current ledger balance: 22,541 UGX. Adjustment needed: 566,156 UGX
INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata)
VALUES (
  '8b590bb1-6cda-47af-96e1-0c35d628a01c',
  'ADJUSTMENT',
  566156,
  'ADJ-RECON-20260309-BALANCE-CORRECTION',
  '{"reason": "Balance reconciliation to match verified balance of 588,697 UGX", "adjusted_by": "system-admin", "previous_balance": 22541, "corrected_balance": 588697}'::jsonb
);
