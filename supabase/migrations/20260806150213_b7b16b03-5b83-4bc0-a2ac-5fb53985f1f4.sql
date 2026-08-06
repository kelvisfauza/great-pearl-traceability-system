SELECT cron.schedule(
  'process-salary-auto-invest-v2',
  '0 9 27 * *',
  $$SELECT net.http_post(
    url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/process-salary-auto-invest',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
    body:='{"triggered_by": "cron"}'::jsonb
  ) AS request_id;$$
);