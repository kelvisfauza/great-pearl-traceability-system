SELECT cron.schedule(
  'expire-pending-requests-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/expire-pending-requests',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);