-- Force-fail Wyclif's stuck withdrawal and refund UGX 10,000
UPDATE instant_withdrawals 
SET payout_status = 'failed', completed_at = now()
WHERE id = 'caf3d4e5-fef8-464d-be3d-25039b285cfd' 
  AND payout_status = 'pending_approval';

INSERT INTO ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
VALUES (
  '13112b82-bfe6-4629-93ee-522b099318a9',
  'DEPOSIT',
  10000,
  'REFUND-INSTANT-WD-caf3d4e5-fef8-464d-be3d-25039b285cfd',
  'SYSTEM_AWARD',
  '{"type": "instant_withdrawal_refund", "original_ref": "INSTANT-WD-1776077501824", "reason": "Declined at Yo Payments dashboard - manual refund"}'::jsonb
)
ON CONFLICT DO NOTHING;