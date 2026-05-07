SELECT cron.unschedule('notify-system-errors-every-15min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='notify-system-errors-every-15min');
SELECT cron.unschedule('notify-system-errors-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='notify-system-errors-hourly');
SELECT cron.schedule(
  'notify-system-errors-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/notify-system-errors',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);