-- Trigger the backfill for current month
SELECT net.http_post(
    url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/backfill-salary-credits',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk"}'::jsonb,
    body:=('{"month": ' || EXTRACT(MONTH FROM CURRENT_DATE) || ', "year": ' || EXTRACT(YEAR FROM CURRENT_DATE) || '}')::jsonb
) as backfill_request;