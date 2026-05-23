
CREATE TABLE IF NOT EXISTS public.scheduled_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('general_monday','departmental_tuesday')),
  department text,
  title text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
  call_id uuid REFERENCES public.group_calls(id) ON DELETE SET NULL,
  host_user_id uuid NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_meetings_general
  ON public.scheduled_meetings (scheduled_date)
  WHERE kind = 'general_monday';

CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_meetings_dept
  ON public.scheduled_meetings (scheduled_date, department)
  WHERE kind = 'departmental_tuesday';

CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_status
  ON public.scheduled_meetings(status, scheduled_for DESC);

ALTER TABLE public.scheduled_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view scheduled meetings"
  ON public.scheduled_meetings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage scheduled meetings"
  ON public.scheduled_meetings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'Administrator'::app_role) OR public.has_role(auth.uid(), 'Super Admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Administrator'::app_role) OR public.has_role(auth.uid(), 'Super Admin'::app_role));

CREATE TABLE IF NOT EXISTS public.meeting_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_meeting_id uuid NOT NULL REFERENCES public.scheduled_meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','joined','declined','no_show','left')),
  prompted_at timestamptz,
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scheduled_meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_attendance_user ON public.meeting_attendance(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_meeting ON public.meeting_attendance(scheduled_meeting_id);

ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own attendance, admins view all"
  ON public.meeting_attendance FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'Super Admin'::app_role));

CREATE POLICY "Users upsert own attendance"
  ON public.meeting_attendance FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own attendance"
  ON public.meeting_attendance FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage attendance"
  ON public.meeting_attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'Administrator'::app_role) OR public.has_role(auth.uid(), 'Super Admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Administrator'::app_role) OR public.has_role(auth.uid(), 'Super Admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_active_scheduled_meeting_for_user(_user_id uuid)
RETURNS TABLE(
  meeting_id uuid,
  kind text,
  title text,
  department text,
  call_id uuid,
  scheduled_for timestamptz,
  started_at timestamptz,
  attendance_status text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _dept text;
BEGIN
  SELECT department INTO _dept FROM public.employees
    WHERE auth_user_id = _user_id AND coalesce(disabled, false) = false
    LIMIT 1;

  RETURN QUERY
  SELECT sm.id, sm.kind, sm.title, sm.department, sm.call_id, sm.scheduled_for, sm.started_at,
         coalesce(ma.status, 'pending')::text
  FROM public.scheduled_meetings sm
  LEFT JOIN public.meeting_attendance ma
    ON ma.scheduled_meeting_id = sm.id AND ma.user_id = _user_id
  WHERE sm.status = 'live'
    AND sm.started_at >= (now() - interval '90 minutes')
    AND sm.call_id IS NOT NULL
    AND (
      sm.kind = 'general_monday'
      OR (sm.kind = 'departmental_tuesday' AND _dept IS NOT NULL AND sm.department = _dept)
    )
    AND coalesce(ma.status, 'pending') = 'pending'
  ORDER BY sm.started_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_scheduled_meeting_for_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_meeting_attendance(_meeting_id uuid, _status text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated'); END IF;
  IF _status NOT IN ('joined','declined','left','pending') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  INSERT INTO public.meeting_attendance(scheduled_meeting_id, user_id, status,
    prompted_at, joined_at, left_at)
  VALUES (_meeting_id, _uid, _status, now(),
    CASE WHEN _status = 'joined' THEN now() ELSE NULL END,
    CASE WHEN _status = 'left' THEN now() ELSE NULL END)
  ON CONFLICT (scheduled_meeting_id, user_id) DO UPDATE
  SET status = EXCLUDED.status,
      prompted_at = COALESCE(public.meeting_attendance.prompted_at, EXCLUDED.prompted_at),
      joined_at = COALESCE(public.meeting_attendance.joined_at, EXCLUDED.joined_at),
      left_at = CASE WHEN EXCLUDED.status = 'left' THEN now() ELSE public.meeting_attendance.left_at END,
      updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_meeting_attendance(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_meeting_no_shows(_meeting_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.meeting_attendance
  SET status = 'no_show', updated_at = now()
  WHERE scheduled_meeting_id = _meeting_id AND status = 'pending';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
