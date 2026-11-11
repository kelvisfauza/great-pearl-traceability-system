CREATE OR REPLACE FUNCTION public.get_active_scheduled_meeting_for_user(_user_id uuid)
 RETURNS TABLE(meeting_id uuid, kind text, title text, department text, call_id uuid, scheduled_for timestamp with time zone, started_at timestamp with time zone, attendance_status text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _dept text;
BEGIN
  SELECT e.department INTO _dept FROM public.employees e
    WHERE e.auth_user_id = _user_id AND coalesce(e.disabled, false) = false LIMIT 1;
  RETURN QUERY
  SELECT sm.id, sm.kind, sm.title, sm.department, sm.call_id, sm.scheduled_for, sm.started_at,
         coalesce(ma.status, 'pending')::text
  FROM public.scheduled_meetings sm
  LEFT JOIN public.meeting_attendance ma ON ma.scheduled_meeting_id = sm.id AND ma.user_id = _user_id
  WHERE sm.status = 'live' AND sm.started_at >= (now() - interval '90 minutes') AND sm.call_id IS NOT NULL
    AND (sm.kind = 'general_monday' OR (sm.kind = 'departmental_tuesday' AND _dept IS NOT NULL AND sm.department = _dept))
    AND coalesce(ma.status, 'pending') = 'pending'
  ORDER BY sm.started_at DESC LIMIT 1;
END; $function$;