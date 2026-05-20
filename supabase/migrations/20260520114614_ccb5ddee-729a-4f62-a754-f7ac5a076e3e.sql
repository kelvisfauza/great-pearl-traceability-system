CREATE OR REPLACE FUNCTION public.award_host_meeting_bonus(_call_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  call_row RECORD;
  caller UUID;
  duration_seconds INTEGER;
  joined_others INTEGER;
  ref_code TEXT;
  bonus_amount NUMERIC := 4000;
BEGIN
  caller := auth.uid();
  IF caller IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  SELECT * INTO call_row FROM public.group_calls WHERE id = _call_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Call not found');
  END IF;

  IF call_row.host_id <> caller THEN
    RETURN json_build_object('success', false, 'message', 'Only the host can claim this bonus');
  END IF;

  duration_seconds := GREATEST(
    EXTRACT(EPOCH FROM (COALESCE(call_row.ended_at, NOW()) - call_row.started_at))::INTEGER,
    0
  );

  IF duration_seconds < 300 THEN
    RETURN json_build_object('success', false, 'message', 'Meeting too short', 'duration_seconds', duration_seconds);
  END IF;

  SELECT COUNT(*) INTO joined_others
  FROM public.group_call_participants
  WHERE call_id = _call_id
    AND user_id <> call_row.host_id
    AND status = 'joined';

  IF joined_others < 1 THEN
    RETURN json_build_object('success', false, 'message', 'No other participants joined');
  END IF;

  ref_code := 'HOST-MEETING-BONUS-' || _call_id::TEXT;

  IF EXISTS (SELECT 1 FROM public.ledger_entries WHERE reference = ref_code) THEN
    RETURN json_build_object('success', false, 'message', 'Bonus already awarded');
  END IF;

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
  VALUES (
    caller::TEXT,
    'HOST_MEETING_BONUS',
    bonus_amount,
    ref_code,
    jsonb_build_object(
      'activity_type', 'host_meeting_bonus',
      'reward', bonus_amount,
      'call_id', _call_id,
      'duration_seconds', duration_seconds,
      'joined_others', joined_others,
      'description', 'Host bonus for ' || COALESCE(call_row.title, 'group meeting') || ' (5+ min, active participation)'
    ),
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'reward_given', bonus_amount,
    'duration_seconds', duration_seconds,
    'joined_others', joined_others
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.award_host_meeting_bonus(uuid) TO authenticated;