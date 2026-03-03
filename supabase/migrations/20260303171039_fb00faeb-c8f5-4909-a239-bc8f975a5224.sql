UPDATE public.withdrawal_requests 
SET payout_status = 'failed', 
    payout_error = 'transfer Rejected (GosentePay code 201) - likely insufficient merchant balance',
    payout_attempted_at = now()
WHERE id = '5687ff2f-e1fa-4bb0-937a-50e65d97fe28';