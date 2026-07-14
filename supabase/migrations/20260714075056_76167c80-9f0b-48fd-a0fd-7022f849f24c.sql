
SELECT cron.unschedule('send-loan-reminders-daily');

SELECT cron.schedule(
  'send-loan-reminders-morning',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/send-loan-reminders',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
    body:='{"trigger":"morning"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'send-loan-reminders-midday',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/send-loan-reminders',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
    body:='{"trigger":"midday"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'send-loan-reminders-evening',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/send-loan-reminders',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
    body:='{"trigger":"evening"}'::jsonb
  );
  $$
);
