
-- Fix Benson's stuck withdrawal: trigger the updated BEFORE trigger by touching the record
-- The trigger will auto-set approved_at and admin_approved_2_at from admin_final_approval
UPDATE money_requests 
SET 
  admin_approved_2_at = admin_final_approval_at,
  admin_approved_2_by = admin_final_approval_by,
  approved_at = admin_final_approval_at,
  approved_by = admin_final_approval_by,
  status = 'approved',
  payout_status = 'sent',
  payout_ref = 'CASH-COLLECT',
  payment_channel = 'CASH',
  updated_at = now()
WHERE id = '36e0cd10-a4c1-431b-95d3-e37039d11965'
AND approved_at IS NULL;
