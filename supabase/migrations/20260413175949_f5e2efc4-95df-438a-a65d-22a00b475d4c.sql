
-- Add device and location columns to user_presence
ALTER TABLE public.user_presence 
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS browser TEXT,
  ADD COLUMN IF NOT EXISTS os TEXT,
  ADD COLUMN IF NOT EXISTS device_type TEXT;

-- Create a historical session log table for tracking all sessions
CREATE TABLE public.user_session_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  employee_name TEXT,
  employee_email TEXT,
  ip_address TEXT,
  city TEXT,
  country TEXT,
  browser TEXT,
  os TEXT,
  device_type TEXT,
  login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  logout_at TIMESTAMP WITH TIME ZONE,
  session_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_session_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own session logs
CREATE POLICY "Users can insert own session logs"
  ON public.user_session_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can view all session logs (IT needs visibility)
CREATE POLICY "Authenticated users can view session logs"
  ON public.user_session_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own session logs (for logout_at)
CREATE POLICY "Users can update own session logs"
  ON public.user_session_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX idx_user_session_logs_user_id ON public.user_session_logs(user_id);
CREATE INDEX idx_user_session_logs_login_at ON public.user_session_logs(login_at DESC);
