
SELECT cron.schedule(
  'send-loan-reminders-daily-v2',
  '0 7 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://pudfybkyfedeggmokhco.supabase.co/functions/v1/send-loan-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{"triggered_by":"daily_cron"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'process-loan-repayments-daily-v2',
  '0 4 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://pudfybkyfedeggmokhco.supabase.co/functions/v1/process-loan-repayments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{"triggered_by":"daily_cron"}'::jsonb
  );
  $$
);
