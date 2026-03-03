-- Mark old approved withdrawals as already sent (they were manually disbursed)
UPDATE withdrawal_requests 
SET payout_status = 'sent', payout_ref = 'manual-disbursed-earlier' 
WHERE status = 'approved' 
AND channel = 'MOBILE_MONEY' 
AND finance_approved_at IS NOT NULL 
AND payout_status IN ('pending', 'failed', 'processing')
AND finance_approved_at < '2026-03-03T15:54:00Z'
AND id NOT IN ('5687ff2f-e1fa-4bb0-937a-50e65d97fe28');

-- Mark CASH as not applicable
UPDATE withdrawal_requests 
SET payout_status = 'not_applicable'
WHERE channel = 'CASH' AND payout_status = 'pending';