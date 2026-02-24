
CREATE OR REPLACE FUNCTION public.award_activity_reward(
  user_uuid UUID,
  activity_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reward_amount NUMERIC;
  monthly_total NUMERIC;
  monthly_cap NUMERIC := 50000;
  month_start DATE;
  remaining_cap NUMERIC;
  actual_reward NUMERIC;
BEGIN
  CASE activity_name
    WHEN 'data_entry' THEN reward_amount := 100;
    WHEN 'form_submission' THEN reward_amount := 200;
    WHEN 'report_generation' THEN reward_amount := 300;
    WHEN 'task_completion' THEN reward_amount := 200;
    WHEN 'document_upload' THEN reward_amount := 150;
    WHEN 'transaction' THEN reward_amount := 250;
    ELSE reward_amount := 50;
  END CASE;

  month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  SELECT COALESCE(SUM(amount), 0)
  INTO monthly_total
  FROM public.ledger_entries
  WHERE user_id = user_uuid::TEXT
    AND entry_type = 'LOYALTY_REWARD'
    AND created_at >= month_start;

  remaining_cap := monthly_cap - monthly_total;

  IF remaining_cap <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Monthly loyalty cap of 50,000 UGX reached',
      'monthly_total', monthly_total,
      'reward_given', 0
    );
  END IF;

  actual_reward := LEAST(reward_amount, remaining_cap);

  -- Update the most recent activity record
  UPDATE public.user_activity
  SET reward_amount = actual_reward
  WHERE id = (
    SELECT id FROM public.user_activity
    WHERE user_id = user_uuid
      AND activity_type = activity_name
      AND activity_date = CURRENT_DATE
    ORDER BY created_at DESC
    LIMIT 1
  );

  INSERT INTO public.ledger_entries (
    user_id, entry_type, amount, reference, metadata, created_at
  ) VALUES (
    user_uuid::TEXT,
    'LOYALTY_REWARD',
    actual_reward,
    'LOYALTY-' || activity_name || '-' || CURRENT_DATE || '-' || gen_random_uuid()::TEXT,
    json_build_object(
      'activity_type', activity_name,
      'base_reward', reward_amount,
      'actual_reward', actual_reward,
      'monthly_total', monthly_total + actual_reward,
      'monthly_cap', monthly_cap
    ),
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Loyalty reward credited',
    'reward_given', actual_reward,
    'monthly_total', monthly_total + actual_reward,
    'monthly_remaining', monthly_cap - (monthly_total + actual_reward)
  );
END;
$$;
