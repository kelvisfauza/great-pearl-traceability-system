-- Daily reconciliation cron for MoMo direct loan repayments (paired-entry safety net)
SELECT cron.unschedule('reconcile-momo-loan-repayments-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconcile-momo-loan-repayments-daily');

SELECT cron.schedule(
  'reconcile-momo-loan-repayments-daily',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pudfybkyfedeggmokhco.supabase.co/functions/v1/reconcile-momo-loan-repayments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);