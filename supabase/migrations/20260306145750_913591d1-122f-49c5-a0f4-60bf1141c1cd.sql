UPDATE public.withdrawal_requests
SET payout_status = 'pending',
    payout_error = NULL,
    payout_attempted_at = NULL
WHERE id = 'ea24fbee-3628-484c-b159-5f4ada203f5b';