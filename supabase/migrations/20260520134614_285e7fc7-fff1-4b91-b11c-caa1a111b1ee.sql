CREATE OR REPLACE FUNCTION public.auto_award_meeting_bonuses_on_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p RECORD;
  dur INTEGER;
  effective_join TIMESTAMPTZ;
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
      AND (joined_at IS NOT NULL OR left_at IS NOT NULL)
  LOOP
    effective_join := COALESCE(p.joined_at, NEW.started_at);
    effective_left := COALESCE(p.left_at, NEW.ended_at, NOW());
    dur := GREATEST(EXTRACT(EPOCH FROM (effective_left - effective_join))::INTEGER, 0);
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
        'joined_at_inferred', p.joined_at IS NULL,
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
    AND (joined_at IS NOT NULL OR left_at IS NOT NULL);

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
$$;

-- Backfill missed attendance bonuses for last 24h of ended meetings using the new rule
DO $$
DECLARE
  c RECORD; p RECORD; dur INTEGER; ref_code TEXT;
  eff_join TIMESTAMPTZ; eff_left TIMESTAMPTZ;
BEGIN
  FOR c IN SELECT * FROM public.group_calls WHERE status='ended' AND ended_at >= NOW() - INTERVAL '24 hours' LOOP
    FOR p IN
      SELECT user_id, joined_at, left_at FROM public.group_call_participants
      WHERE call_id = c.id AND user_id <> c.host_id
        AND (joined_at IS NOT NULL OR left_at IS NOT NULL)
    LOOP
      eff_join := COALESCE(p.joined_at, c.started_at);
      eff_left := COALESCE(p.left_at, c.ended_at, NOW());
      dur := GREATEST(EXTRACT(EPOCH FROM (eff_left - eff_join))::INTEGER, 0);
      IF dur < 300 THEN CONTINUE; END IF;
      ref_code := 'MEETING-ATTENDANCE-' || c.id::TEXT || '-' || p.user_id::TEXT;
      IF EXISTS (SELECT 1 FROM public.ledger_entries WHERE reference = ref_code) THEN CONTINUE; END IF;
      INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
      VALUES (
        p.user_id::TEXT,'MEETING_ATTENDANCE_BONUS',2000,ref_code,
        jsonb_build_object('activity_type','meeting_attendance_bonus','reward',2000,
          'call_id',c.id,'duration_seconds',dur,
          'joined_at_inferred', p.joined_at IS NULL,
          'auto_awarded',true,'backfilled',true,
          'description','Attendance bonus for ' || COALESCE(c.title,'group meeting')),
        NOW()
      );
    END LOOP;
  END LOOP;
END $$;