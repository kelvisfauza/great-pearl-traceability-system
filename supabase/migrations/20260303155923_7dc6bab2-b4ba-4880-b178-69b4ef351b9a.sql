-- Create a cron job that calls auto-disburse-withdrawals every minute
SELECT cron.schedule(
  'auto-disburse-withdrawals',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pudfybkyfedeggmokhco.supabase.co/functions/v1/auto-disburse-withdrawals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);