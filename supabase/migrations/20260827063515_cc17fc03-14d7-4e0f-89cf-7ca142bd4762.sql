SELECT cron.schedule(
  'process-matured-investments-v2',
  '15 6 * * *',
  $$
  SELECT net.http_post(
    url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/process-investments',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);