CREATE OR REPLACE FUNCTION public.get_effective_wallet_balance(p_user_id text)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(le.amount), 0)
  FROM public.ledger_entries le
  WHERE le.user_id = p_user_id
    AND le.entry_type IN (
      'LOYALTY_REWARD','BONUS','DEPOSIT','WITHDRAWAL','ADJUSTMENT',
      'MONTHLY_SALARY','ADVANCE_RECOVERY','LOAN_DISBURSEMENT','LOAN_REPAYMENT','LOAN_RECOVERY',
      'HOST_MEETING_BONUS','MEETING_ATTENDANCE_BONUS'
    )
    AND NOT (
      COALESCE(le.metadata->>'allowance_type', '') IN ('airtime_allowance', 'data_allowance')
      AND le.entry_type IN ('DEPOSIT', 'PAYOUT')
    );
$function$;

CREATE OR REPLACE FUNCTION public.award_all_meeting_attendance_bonuses(_call_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  call_row RECORD;
  caller UUID;
  p RECORD;
  dur INTEGER;
  ref_code TEXT;
  base_amount NUMERIC := 2000;
  awarded INTEGER := 0;
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
    RETURN json_build_object('success', false, 'message', 'Only host can trigger this');
  END IF;

  FOR p IN
    SELECT user_id, joined_at, left_at
    FROM public.group_call_participants
    WHERE call_id = _call_id
      AND user_id <> call_row.host_id
      AND joined_at IS NOT NULL
  LOOP
    dur := GREATEST(
      EXTRACT(EPOCH FROM (COALESCE(p.left_at, call_row.ended_at, NOW()) - p.joined_at))::INTEGER,
      0
    );
    IF dur < 300 THEN CONTINUE; END IF;

    ref_code := 'MEETING-ATTENDANCE-' || _call_id::TEXT || '-' || p.user_id::TEXT;
    IF EXISTS (SELECT 1 FROM public.ledger_entries WHERE reference = ref_code) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
    VALUES (
      p.user_id::TEXT,
      'MEETING_ATTENDANCE_BONUS',
      base_amount,
      ref_code,
      jsonb_build_object(
        'activity_type', 'meeting_attendance_bonus',
        'reward', base_amount,
        'call_id', _call_id,
        'duration_seconds', dur,
        'auto_awarded', true,
        'description', 'Attendance bonus for ' || COALESCE(call_row.title, 'group meeting')
      ),
      NOW()
    );
    awarded := awarded + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'awarded', awarded);
END;
$function$;

-- Retroactive backfill: award all qualifying joined participants from ended calls in the last 2 days
DO $$
DECLARE
  c RECORD;
  p RECORD;
  dur INTEGER;
  ref_code TEXT;
BEGIN
  FOR c IN SELECT * FROM public.group_calls WHERE status = 'ended' AND ended_at > now() - interval '2 days'
  LOOP
    FOR p IN
      SELECT user_id, joined_at, left_at
      FROM public.group_call_participants
      WHERE call_id = c.id AND user_id <> c.host_id AND joined_at IS NOT NULL
    LOOP
      dur := GREATEST(EXTRACT(EPOCH FROM (COALESCE(p.left_at, c.ended_at, NOW()) - p.joined_at))::INTEGER, 0);
      IF dur < 300 THEN CONTINUE; END IF;
      ref_code := 'MEETING-ATTENDANCE-' || c.id::TEXT || '-' || p.user_id::TEXT;
      IF EXISTS (SELECT 1 FROM public.ledger_entries WHERE reference = ref_code) THEN CONTINUE; END IF;
      INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
      VALUES (
        p.user_id::TEXT, 'MEETING_ATTENDANCE_BONUS', 2000, ref_code,
        jsonb_build_object(
          'activity_type','meeting_attendance_bonus','reward',2000,
          'call_id',c.id,'duration_seconds',dur,'auto_awarded',true,'backfill',true,
          'description','Attendance bonus for ' || COALESCE(c.title,'group meeting')
        ),
        NOW()
      );
    END LOOP;
  END LOOP;
END $$;