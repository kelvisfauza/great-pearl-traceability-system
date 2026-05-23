
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule(jobname) FROM cron.job
 WHERE jobname IN ('scheduled-meetings-create-monday','scheduled-meetings-create-tuesday','scheduled-meetings-end-stale');

SELECT cron.schedule(
  'scheduled-meetings-create-monday', '0 6 * * 1',
  $$ select net.http_post(
       url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/scheduled-meetings-runner',
       headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
       body:='{"action":"create-general"}'::jsonb); $$
);

SELECT cron.schedule(
  'scheduled-meetings-create-tuesday', '0 6 * * 2',
  $$ select net.http_post(
       url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/scheduled-meetings-runner',
       headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
       body:='{"action":"create-departmental"}'::jsonb); $$
);

SELECT cron.schedule(
  'scheduled-meetings-end-stale', '*/10 * * * *',
  $$ select net.http_post(
       url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/scheduled-meetings-runner',
       headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
       body:='{"action":"end-stale"}'::jsonb); $$
);
