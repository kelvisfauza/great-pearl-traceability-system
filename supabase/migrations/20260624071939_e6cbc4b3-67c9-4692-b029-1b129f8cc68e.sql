CREATE OR REPLACE FUNCTION public.award_approval_reward(
  user_uuid uuid,
  request_id text DEFAULT NULL,
  approval_role text DEFAULT 'approver'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  monthly_cap NUMERIC := 50000;
  per_action NUMERIC := 200;
  daily_action_cap INTEGER := 10;
  month_start DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  monthly_total NUMERIC;
  today_approval_count INTEGER;
  existing_count INTEGER;
  ref_key TEXT;
BEGIN
  IF user_uuid IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Missing user', 'reward_given', 0);
  END IF;

  -- Idempotency: one reward per (user, request_id, role)
  IF request_id IS NOT NULL THEN
    ref_key := 'LOYALTY-approval-' || approval_role || '-' || request_id;
    SELECT COUNT(*) INTO existing_count
    FROM public.ledger_entries
    WHERE user_id = user_uuid::TEXT
      AND entry_type = 'LOYALTY_REWARD'
      AND reference = ref_key;
    IF existing_count > 0 THEN
      RETURN json_build_object('success', false, 'message', 'Already rewarded', 'reward_given', 0);
    END IF;
  ELSE
    ref_key := 'LOYALTY-approval-' || approval_role || '-' || CURRENT_DATE || '-' || gen_random_uuid()::TEXT;
  END IF;

  -- Daily action cap (10 approval rewards per day)
  SELECT COUNT(*) INTO today_approval_count
  FROM public.ledger_entries
  WHERE user_id = user_uuid::TEXT
    AND entry_type = 'LOYALTY_REWARD'
    AND (metadata::jsonb->>'activity_type') = 'approval_action'
    AND DATE(created_at) = CURRENT_DATE;

  IF today_approval_count >= daily_action_cap THEN
    RETURN json_build_object('success', false, 'message', 'Daily approval reward cap reached', 'reward_given', 0);
  END IF;

  -- Monthly cap (shared loyalty cap)
  SELECT COALESCE(SUM(amount), 0) INTO monthly_total
  FROM public.ledger_entries
  WHERE user_id = user_uuid::TEXT
    AND entry_type = 'LOYALTY_REWARD'
    AND created_at >= month_start;

  IF monthly_total + per_action > monthly_cap THEN
    RETURN json_build_object('success', false, 'message', 'Monthly loyalty cap reached', 'reward_given', 0);
  END IF;

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
  VALUES (
    user_uuid::TEXT,
    'LOYALTY_REWARD',
    per_action,
    ref_key,
    jsonb_build_object(
      'activity_type', 'approval_action',
      'approval_role', approval_role,
      'request_id', request_id,
      'reward', per_action
    ),
    NOW()
  );

  RETURN json_build_object('success', true, 'reward_given', per_action, 'today_count', today_approval_count + 1);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.award_approval_reward(uuid, text, text) TO authenticated, service_role;