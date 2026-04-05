
SELECT cron.unschedule(32);

SELECT cron.schedule(
  'daily-department-all-summary',
  '0 14 * * 1-6',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.service_url') || '/functions/v1/daily-department-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key')
    ),
    body := '{"departments": ["quality", "admin", "operations", "field", "it", "finance", "eudr", "sales"]}'::jsonb
  ) AS request_id;
  $$
);
