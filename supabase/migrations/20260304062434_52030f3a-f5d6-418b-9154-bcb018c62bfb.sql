-- One-time reset for Benson's stuck withdrawal
UPDATE public.withdrawal_requests
SET payout_status = 'pending', payout_attempted_at = NULL, payout_error = NULL, updated_at = now()
WHERE id = '9dfbf220-4006-42db-8871-638db1051135'
  AND status = 'approved'
  AND channel = 'MOBILE_MONEY'
  AND payout_status = 'processing'
  AND payout_ref IS NULL;