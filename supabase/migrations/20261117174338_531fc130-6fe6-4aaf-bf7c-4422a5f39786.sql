ALTER TABLE public.device_sessions ADD COLUMN IF NOT EXISTS hardware_signature text;
CREATE INDEX IF NOT EXISTS device_sessions_user_hw_idx ON public.device_sessions (user_email, hardware_signature);