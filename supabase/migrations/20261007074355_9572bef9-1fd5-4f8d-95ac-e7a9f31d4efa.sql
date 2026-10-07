ALTER TABLE public.overdraft_accounts ALTER COLUMN interest_rate_bps SET DEFAULT 120;
DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.overdraft_daily_maintenance'::regproc);
  d := replace(d, 'COALESCE(interest_rate_bps, 60), 60)', 'COALESCE(interest_rate_bps, 120), 120)');
  d := replace(d, 'COALESCE(r.interest_rate_bps, 60)', 'COALESCE(r.interest_rate_bps, 120)');
  EXECUTE d;
END $$;