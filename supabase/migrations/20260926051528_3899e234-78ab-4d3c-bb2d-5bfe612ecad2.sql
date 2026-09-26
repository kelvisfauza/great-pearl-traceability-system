-- lovable-cron-fallback-reviewed: Teams channel messages cannot be pushed to us; the watcher must poll the HR channel. Every 5 minutes keeps pickup under ~5 min at minimal cost.
CREATE TABLE public.teams_leave_processed (
  message_id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'created',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.teams_leave_processed TO service_role;

ALTER TABLE public.teams_leave_processed ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (edge function) touches this table.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'teams-leave-inbox') THEN
    PERFORM cron.unschedule('teams-leave-inbox');
  END IF;
END $$;

SELECT cron.schedule(
  'teams-leave-inbox',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pudfybkyfedeggmokhco.supabase.co/functions/v1/teams-leave-inbox',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);