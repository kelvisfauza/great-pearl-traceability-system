-- Fix the incorrect refund: insert a corrective WITHDRAWAL entry to reverse the false refund
INSERT INTO ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
VALUES (
  '010f057a-92e3-479d-89b2-a801ef851949',
  'WITHDRAWAL',
  -70000,
  'CORRECTION-FALSE-REFUND-2698f70f-8e40-4777-9366-f1cee7f2769b',
  'WITHDRAWAL',
  '{"type": "correction", "reason": "Reversed false refund - MoMo payout was actually successful", "original_refund_ref": "REFUND-INSTANT-WD-2698f70f-8e40-4777-9366-f1cee7f2769b"}'::jsonb
);

-- Mark the withdrawal as successful
UPDATE instant_withdrawals 
SET payout_status = 'success'
WHERE id = '2698f70f-8e40-4777-9366-f1cee7f2769b';