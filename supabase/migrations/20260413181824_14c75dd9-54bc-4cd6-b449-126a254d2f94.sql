-- Add session_date column for daily grouping
ALTER TABLE public.user_session_logs 
ADD COLUMN IF NOT EXISTS session_date DATE;

-- Backfill existing records
UPDATE public.user_session_logs 
SET session_date = DATE(login_at AT TIME ZONE 'Africa/Kampala')
WHERE session_date IS NULL;

-- Make it NOT NULL with default going forward
ALTER TABLE public.user_session_logs 
ALTER COLUMN session_date SET DEFAULT CURRENT_DATE;

-- Auto-set session_date on insert
CREATE OR REPLACE FUNCTION public.set_session_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.session_date := DATE(NEW.login_at AT TIME ZONE 'Africa/Kampala');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_set_session_date
BEFORE INSERT ON public.user_session_logs
FOR EACH ROW
EXECUTE FUNCTION public.set_session_date();

-- Auto-calculate session_duration_minutes on logout
CREATE OR REPLACE FUNCTION public.calc_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.logout_at IS NOT NULL AND OLD.logout_at IS NULL THEN
    NEW.session_duration_minutes := EXTRACT(EPOCH FROM (NEW.logout_at - NEW.login_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_calc_session_duration
BEFORE UPDATE ON public.user_session_logs
FOR EACH ROW
EXECUTE FUNCTION public.calc_session_duration();

-- Index for fast daily queries
CREATE INDEX IF NOT EXISTS idx_session_logs_date ON public.user_session_logs(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_session_logs_user_date ON public.user_session_logs(user_id, session_date DESC);