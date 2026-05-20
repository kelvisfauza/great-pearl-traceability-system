-- Group calls (mesh WebRTC)
CREATE TABLE public.group_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('audio','video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','active','ended')),
  conversation_id UUID NULL,
  title TEXT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.group_call_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.group_calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','joined','declined','left','missed')),
  joined_at TIMESTAMPTZ NULL,
  left_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(call_id, user_id)
);

CREATE INDEX idx_gcp_call ON public.group_call_participants(call_id);
CREATE INDEX idx_gcp_user_status ON public.group_call_participants(user_id, status);
CREATE INDEX idx_gc_status ON public.group_calls(status);

ALTER TABLE public.group_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_call_participants ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a participant of a given call?
CREATE OR REPLACE FUNCTION public.is_group_call_participant(_call_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_call_participants
    WHERE call_id = _call_id AND user_id = auth.uid()
  );
$$;

-- group_calls policies
CREATE POLICY "Host or participant can view group call"
ON public.group_calls FOR SELECT
USING (host_id = auth.uid() OR public.is_group_call_participant(id));

CREATE POLICY "Host can create group call"
ON public.group_calls FOR INSERT
WITH CHECK (host_id = auth.uid());

CREATE POLICY "Host can update group call"
ON public.group_calls FOR UPDATE
USING (host_id = auth.uid());

-- group_call_participants policies
CREATE POLICY "Host or participant can view participants"
ON public.group_call_participants FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.group_calls c WHERE c.id = call_id AND c.host_id = auth.uid())
  OR public.is_group_call_participant(call_id)
);

CREATE POLICY "Host can invite participants"
ON public.group_call_participants FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.group_calls c WHERE c.id = call_id AND c.host_id = auth.uid())
);

CREATE POLICY "User can update own participant row"
ON public.group_call_participants FOR UPDATE
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.group_calls c WHERE c.id = call_id AND c.host_id = auth.uid()
));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_call_participants;
ALTER TABLE public.group_calls REPLICA IDENTITY FULL;
ALTER TABLE public.group_call_participants REPLICA IDENTITY FULL;