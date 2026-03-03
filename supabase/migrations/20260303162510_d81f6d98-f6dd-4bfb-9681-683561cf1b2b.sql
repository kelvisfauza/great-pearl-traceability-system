-- Fix John's stuck record (one-time data fix embedded in a no-op migration)
-- This is a schema migration that includes a data fix
DO $$
BEGIN
  UPDATE public.withdrawal_requests 
  SET payout_status = 'failed', 
      payout_error = 'transfer Rejected (GosentePay code 201 - insufficient provider balance)',
      payout_attempted_at = now()
  WHERE id = '5687ff2f-e1fa-4bb0-937a-50e65d97fe28'
    AND payout_status = 'processing';
END $$;