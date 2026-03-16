select cron.unschedule(jobid)
from cron.job
where jobname = 'daily-loyalty-wallet-summary';

select cron.schedule(
  'daily-loyalty-wallet-summary',
  '0 6 * * *',
  $$
  select
    net.http_post(
      url := 'https://pudfybkyfedeggmokhco.supabase.co/functions/v1/daily-loyalty-wallet-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk'
      ),
      body := jsonb_build_object('trigger', 'cron')
    ) as request_id;
  $$
);