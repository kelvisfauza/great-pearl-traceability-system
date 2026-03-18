
-- Reverse the incorrect withdrawal deduction for Benson
-- 1. Delete the withdrawal ledger entry
DELETE FROM ledger_entries 
WHERE id = 'fb742cbc-df22-4bd6-ab6b-27e8bd09445d'
AND user_id = 'eba97d3e-f098-467a-ad78-d0b9639d76a8'
AND reference = 'WD-36e0cd10-a4c1-431b-95d3-e37039d11965';

-- 2. Mark the money_request as cancelled
UPDATE money_requests 
SET status = 'cancelled',
    approval_stage = 'cancelled',
    payout_status = 'reversed',
    updated_at = now()
WHERE id = '36e0cd10-a4c1-431b-95d3-e37039d11965';
