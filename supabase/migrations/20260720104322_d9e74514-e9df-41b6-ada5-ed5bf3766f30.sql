
CREATE OR REPLACE FUNCTION public.auto_award_meeting_bonuses_on_end()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p RECORD;
  dur INTEGER;
  effective_left TIMESTAMPTZ;
  ref_code TEXT;
  base_amount NUMERIC := 2000;
  host_bonus NUMERIC := 4000;
  host_dur INTEGER;
  joined_others INTEGER;
  host_ref TEXT;
BEGIN
  IF NEW.status <> 'ended' THEN RETURN NEW; END IF;
  IF OLD.status = 'ended' THEN RETURN NEW; END IF;

  FOR p IN
    SELECT user_id, joined_at, left_at
    FROM public.group_call_participants
    WHERE call_id = NEW.id
      AND user_id <> NEW.host_id
      AND joined_at IS NOT NULL  -- must have actually joined
  LOOP
    effective_left := COALESCE(p.left_at, NEW.ended_at, NOW());
    dur := GREATEST(EXTRACT(EPOCH FROM (effective_left - p.joined_at))::INTEGER, 0);
    IF dur < 300 THEN CONTINUE; END IF;

    ref_code := 'MEETING-ATTENDANCE-' || NEW.id::TEXT || '-' || p.user_id::TEXT;
    IF EXISTS (SELECT 1 FROM public.ledger_entries WHERE reference = ref_code) THEN CONTINUE; END IF;

    INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
    VALUES (
      p.user_id::TEXT, 'MEETING_ATTENDANCE_BONUS', base_amount, ref_code,
      jsonb_build_object(
        'activity_type','meeting_attendance_bonus',
        'reward',base_amount,'call_id',NEW.id,
        'duration_seconds',dur,
        'auto_awarded',true,
        'description','Attendance bonus for ' || COALESCE(NEW.title,'group meeting')
      ),
      NOW()
    );
  END LOOP;

  host_dur := GREATEST(EXTRACT(EPOCH FROM (COALESCE(NEW.ended_at,NOW()) - NEW.started_at))::INTEGER, 0);
  SELECT COUNT(*) INTO joined_others
  FROM public.group_call_participants
  WHERE call_id = NEW.id AND user_id <> NEW.host_id
    AND joined_at IS NOT NULL;

  IF host_dur >= 300 AND joined_others >= 1 THEN
    host_ref := 'HOST-MEETING-BONUS-' || NEW.id::TEXT;
    IF NOT EXISTS (SELECT 1 FROM public.ledger_entries WHERE reference = host_ref) THEN
      INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
      VALUES (
        NEW.host_id::TEXT,'HOST_MEETING_BONUS',host_bonus,host_ref,
        jsonb_build_object('activity_type','host_meeting_bonus','reward',host_bonus,
          'call_id',NEW.id,'duration_seconds',host_dur,'joined_others',joined_others,
          'auto_awarded',true,
          'description','Host bonus for ' || COALESCE(NEW.title,'group meeting')),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_award_meeting_bonuses_on_end failed for call %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Reverse incorrectly-awarded meeting bonuses where the user never actually joined
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT le.user_id,
       'MEETING_ATTENDANCE_BONUS_REVERSAL',
       -le.amount,
       le.reference || '-REVERSAL',
       jsonb_build_object(
         'reversal_of', le.reference,
         'reason', 'User did not actually join meeting (joined_at was NULL)',
         'auto_reversed', true,
         'description', 'Reversal: attendance bonus given without an actual join'
       ),
       NOW()
FROM public.ledger_entries le
WHERE le.entry_type = 'MEETING_ATTENDANCE_BONUS'
  AND (le.metadata->>'joined_at_inferred')::boolean = true
  AND NOT EXISTS (
    SELECT 1 FROM public.ledger_entries r
    WHERE r.reference = le.reference || '-REVERSAL'
  );
