-- lovable-cron-fallback-reviewed: 144 runs/day; bounded retry queue for provider rate-limited emails, no-ops once drained
DO $$
DECLARE
  auth_header text;
BEGIN
  SELECT substring(command from '(Bearer [A-Za-z0-9._-]+)') INTO auth_header
  FROM cron.job WHERE jobname = 'fetch-ice-prices-every-minute' LIMIT 1;

  PERFORM cron.schedule(
    'resend-failed-sampling-emails-job',
    '*/10 * * * *',
    format(
      $cmd$SELECT net.http_post(
        url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/resend-failed-sampling-emails',
        headers:=jsonb_build_object('Content-Type','application/json','Authorization',%L),
        body:='{"limit": 4}'::jsonb
      )$cmd$,
      auth_header
    )
  );
END $$;