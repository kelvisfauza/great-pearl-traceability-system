
CREATE OR REPLACE FUNCTION public.can_subscribe_realtime_topic(_topic text, _uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id text;
BEGIN
  IF _uid IS NULL OR _topic IS NULL THEN
    RETURN false;
  END IF;

  -- 1:1 call signaling: only caller or callee
  IF _topic ~ '^call:[a-zA-Z0-9_-]+$' THEN
    _id := split_part(_topic, ':', 2);
    RETURN EXISTS (
      SELECT 1 FROM public.call_sessions cs
      WHERE cs.id::text = _id
        AND (cs.caller_id = _uid OR cs.callee_id = _uid)
    );
  END IF;

  -- Group call signaling: host or listed participant
  IF _topic ~ '^group-call:[a-zA-Z0-9_-]+$' THEN
    _id := split_part(_topic, ':', 2);
    RETURN EXISTS (
      SELECT 1 FROM public.group_calls gc
      WHERE gc.id::text = _id AND gc.host_id = _uid
    ) OR EXISTS (
      SELECT 1 FROM public.group_call_participants gcp
      WHERE gcp.call_id::text = _id AND gcp.user_id = _uid
    );
  END IF;

  -- Per-user presence channel: only that user
  IF _topic ~ '^presence-realtime-[a-zA-Z0-9]+$' THEN
    RETURN substring(_topic FROM length('presence-realtime-') + 1) = replace(_uid::text, '-', '');
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_subscribe_realtime_topic(text, uuid) TO authenticated;

DROP POLICY IF EXISTS realtime_authenticated_safe_topics ON realtime.messages;

CREATE POLICY realtime_authenticated_safe_topics
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND public.can_subscribe_realtime_topic(realtime.topic(), auth.uid())
);
