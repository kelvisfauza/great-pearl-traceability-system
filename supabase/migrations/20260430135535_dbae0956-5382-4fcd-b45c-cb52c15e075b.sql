-- Schedule the USSD deposit/repayment reconciler every 10 minutes
SELECT cron.unschedule('reconcile-ussd-deposits') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'reconcile-ussd-deposits'
);

SELECT cron.schedule(
  'reconcile-ussd-deposits',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pudfybkyfedeggmokhco.supabase.co/functions/v1/reconcile-ussd-deposits',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);