-- Reset Shafik's stuck withdrawal from 'processing' back to 'pending' so auto-disburse can pick it up
UPDATE withdrawal_requests 
SET payout_status = 'pending', payout_attempted_at = NULL, payout_error = NULL 
WHERE id = 'db6ddf9a-8caa-4c49-ad62-7b47b39a7ec9' AND payout_status = 'processing';
