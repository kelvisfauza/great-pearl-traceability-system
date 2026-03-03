
-- Create a dedicated login tracker table
CREATE TABLE public.employee_login_tracker (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL,
  employee_id TEXT,
  employee_name TEXT,
  employee_email TEXT,
  login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  login_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(auth_user_id, login_date)
);

-- Enable RLS
ALTER TABLE public.employee_login_tracker ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own login record
CREATE POLICY "Users can insert own login" ON public.employee_login_tracker
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- Allow authenticated users to read their own records
CREATE POLICY "Users can read own logins" ON public.employee_login_tracker
  FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

-- Allow service role full access (for edge function)
CREATE POLICY "Service role full access" ON public.employee_login_tracker
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups by date
CREATE INDEX idx_login_tracker_date ON public.employee_login_tracker(login_date);
CREATE INDEX idx_login_tracker_user_date ON public.employee_login_tracker(auth_user_id, login_date);
