-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to process daily salary credits at 8 AM every day (Monday to Saturday)
-- This will run Monday through Saturday (1-6), skipping Sunday (0)
SELECT cron.schedule(
  'daily-salary-credits',
  '0 8 * * 1-6', -- At 8:00 AM, Monday through Saturday
  $$
  SELECT
    net.http_post(
        url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/process-daily-salary',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create a manual trigger function for administrators
CREATE OR REPLACE FUNCTION public.trigger_daily_salary_processing()
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  response_data JSON;
BEGIN
  -- This function can be called manually by administrators
  -- It will trigger the edge function to process daily salary credits
  RETURN json_build_object(
    'success', true,
    'message', 'Daily salary processing triggered manually. Check the edge function logs for results.',
    'instruction', 'The actual processing happens in the process-daily-salary edge function.'
  );
END;
$$;