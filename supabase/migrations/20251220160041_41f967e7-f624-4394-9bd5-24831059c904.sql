-- Add retry tracking columns to sms_logs
ALTER TABLE sms_logs 
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS next_retry_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_retry_at timestamp with time zone;

-- Create index for efficient retry queries
CREATE INDEX IF NOT EXISTS idx_sms_logs_retry ON sms_logs (status, next_retry_at) 
WHERE status = 'failed' AND (retry_count < max_retries OR retry_count IS NULL);