
CREATE TABLE public.device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  auth_user_id TEXT,
  device_fingerprint TEXT NOT NULL,
  user_agent TEXT,
  browser TEXT,
  os TEXT,
  is_trusted BOOLEAN DEFAULT false,
  verification_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 minutes'),
  token_used_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_email, device_fingerprint)
);

ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own devices" ON public.device_sessions
  FOR SELECT TO authenticated
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own devices" ON public.device_sessions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own devices" ON public.device_sessions
  FOR UPDATE TO authenticated
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Anon can read for token verification" ON public.device_sessions
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can update for token verification" ON public.device_sessions
  FOR UPDATE TO anon
  USING (true);
