-- Manual one-time retry reset for John's stuck MOBILE_MONEY withdrawal
UPDATE public.withdrawal_requests
SET
  payout_status = 'pending',
  payout_attempted_at = NULL,
  payout_error = NULL,
  updated_at = now()
WHERE id = '5687ff2f-e1fa-4bb0-937a-50e65d97fe28'
  AND status = 'approved'
  AND channel = 'MOBILE_MONEY'
  AND payout_status = 'processing'
  AND payout_ref IS NULL;