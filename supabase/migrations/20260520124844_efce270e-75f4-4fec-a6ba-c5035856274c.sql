
CREATE TABLE IF NOT EXISTS public.call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL,
  host_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  transcript TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  message_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS call_recordings_host_idx ON public.call_recordings(host_id);
CREATE INDEX IF NOT EXISTS call_recordings_expires_idx ON public.call_recordings(expires_at);
CREATE INDEX IF NOT EXISTS call_recordings_call_idx ON public.call_recordings(call_id);

ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Host or admin can view call recordings" ON public.call_recordings;
CREATE POLICY "Host or admin can view call recordings"
ON public.call_recordings FOR SELECT
TO authenticated
USING (
  host_id = auth.uid()
  OR public.is_current_user_admin()
);
