ALTER TABLE withdrawal_requests 
ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payout_ref text,
ADD COLUMN IF NOT EXISTS payout_attempted_at timestamptz,
ADD COLUMN IF NOT EXISTS payout_error text;

-- Mark existing approved MOBILE_MONEY withdrawals that were manually disbursed
UPDATE withdrawal_requests 
SET payout_status = 'sent', payout_ref = 'manual-disbursed'
WHERE status = 'approved' 
AND channel = 'MOBILE_MONEY' 
AND finance_approved_at IS NOT NULL
AND id IN ('600cda6d-df73-4b7a-82c8-0243efbf2b4e', 'ba7e1fcc-0320-4aef-b698-4c46b8de3d17');

-- Mark CASH withdrawals as not applicable
UPDATE withdrawal_requests 
SET payout_status = 'not_applicable'
WHERE status = 'approved' AND channel = 'CASH';

-- Mark John's as pending retry
UPDATE withdrawal_requests 
SET payout_status = 'pending'
WHERE id = '5687ff2f-e1fa-4bb0-937a-50e65d97fe28';