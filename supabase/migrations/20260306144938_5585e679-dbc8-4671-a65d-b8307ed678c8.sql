UPDATE public.withdrawal_requests
SET payout_status = 'failed',
    payout_error = 'Payout got stuck in processing (no provider response recorded). Confirm recipient has not received funds, then retry from Finance.',
    updated_at = now()
WHERE id = 'ea24fbee-3628-484c-b159-5f4ada203f5b'
  AND payout_status = 'processing'
  AND payout_ref IS NULL;