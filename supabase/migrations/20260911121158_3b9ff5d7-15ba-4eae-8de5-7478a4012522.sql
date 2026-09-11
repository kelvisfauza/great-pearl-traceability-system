CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'treasury-monitor-hourly') THEN
    PERFORM cron.unschedule('treasury-monitor-hourly');
  END IF;
END $$;
SELECT cron.schedule(
  'treasury-monitor-hourly',
  '5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pudfybkyfedeggmokhco.supabase.co/functions/v1/treasury-monitor',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);