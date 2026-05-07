-- Schedule system error notifications every 15 minutes
SELECT cron.schedule(
  'notify-system-errors-every-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pudfybkyfedeggmokhco.supabase.co/functions/v1/notify-system-errors',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  ) AS request_id;
  $$
);