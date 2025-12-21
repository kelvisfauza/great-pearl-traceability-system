-- Reset failed SMS messages that hit max retries due to insufficient credit
-- so they can be retried now that credits have been topped up
UPDATE sms_logs 
SET retry_count = 0, 
    next_retry_at = now(), 
    failure_reason = 'Reset for retry after credit top-up'
WHERE status = 'failed' 
  AND retry_count >= 10 
  AND failure_reason LIKE '%Insufficient Credit%';