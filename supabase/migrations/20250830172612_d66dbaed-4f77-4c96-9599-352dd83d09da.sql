-- Update Denis's salary to 300,000 UGX per month for testing
UPDATE public.employees 
SET salary = 300000 
WHERE name = 'Denis' OR email = 'denic@gmail.com';

-- Trigger the daily salary processing to credit all working days of the current month
SELECT net.http_post(
    url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/process-daily-salary',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
    body:='{"test_trigger": true}'::jsonb
) as salary_processing_request;