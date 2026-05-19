
CREATE TABLE public.call_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL,
  callee_id UUID NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('audio','video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','active','ended','declined','missed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view calls"
ON public.call_sessions FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Caller can create a call"
ON public.call_sessions FOR INSERT
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Participants can update a call"
ON public.call_sessions FOR UPDATE
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE INDEX idx_call_sessions_callee_status ON public.call_sessions(callee_id, status);
CREATE INDEX idx_call_sessions_caller ON public.call_sessions(caller_id);

ALTER TABLE public.call_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
