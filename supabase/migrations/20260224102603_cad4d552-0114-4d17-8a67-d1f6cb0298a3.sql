
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
  monthly_total NUMERIC;
  monthly_cap NUMERIC := 50000;
  month_start DATE;
  remaining_cap NUMERIC;
  remaining_days INTEGER;
  daily_budget NUMERIC;
  today_earned NUMERIC;
  base_weight NUMERIC;
  actual_reward NUMERIC;
  today_budget NUMERIC;
BEGIN
  month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  SELECT COUNT(*)::INTEGER INTO remaining_days
  FROM generate_series(CURRENT_DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE, '1 day'::INTERVAL) d
  WHERE EXTRACT(DOW FROM d) != 0;

  IF remaining_days < 1 THEN remaining_days := 1; END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO monthly_total
  FROM public.ledger_entries
  WHERE user_id = user_uuid::TEXT
    AND entry_type = 'LOYALTY_REWARD'
    AND created_at >= month_start;

  remaining_cap := monthly_cap - monthly_total;

  IF remaining_cap <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Monthly cap reached', 'monthly_total', monthly_total, 'reward_given', 0);
  END IF;

  daily_budget := remaining_cap / remaining_days;

  SELECT COALESCE(SUM(amount), 0)
  INTO today_earned
  FROM public.ledger_entries
  WHERE user_id = user_uuid::TEXT
    AND entry_type = 'LOYALTY_REWARD'
    AND DATE(created_at) = CURRENT_DATE;

  today_budget := GREATEST(daily_budget - today_earned, 0);

  IF today_budget <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Daily budget used', 'monthly_total', monthly_total, 'reward_given', 0);
  END IF;

  -- Activity weights - all pages contribute
  CASE activity_name
    WHEN 'data_entry' THEN base_weight := 0.5;
    WHEN 'form_submission' THEN base_weight := 1.0;
    WHEN 'report_generation' THEN base_weight := 1.2;
    WHEN 'task_completion' THEN base_weight := 0.9;
    WHEN 'document_upload' THEN base_weight := 0.7;
    WHEN 'transaction' THEN base_weight := 1.0;
    WHEN 'page_visit' THEN base_weight := 0.2;
    WHEN 'interaction' THEN base_weight := 0.15;
    ELSE base_weight := 0.3;
  END CASE;

  -- Dynamic reward calculation
  actual_reward := ROUND((today_budget / 20.0) * base_weight);
  actual_reward := GREATEST(actual_reward, 1);
  actual_reward := LEAST(actual_reward, remaining_cap);
  actual_reward := LEAST(actual_reward, today_budget);

  UPDATE public.user_activity
  SET reward_amount = actual_reward
  WHERE id = (
    SELECT id FROM public.user_activity
    WHERE user_id = user_uuid AND activity_type = activity_name AND activity_date = CURRENT_DATE
    ORDER BY created_at DESC LIMIT 1
  );

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
  VALUES (
    user_uuid::TEXT, 'LOYALTY_REWARD', actual_reward,
    'LOYALTY-' || activity_name || '-' || CURRENT_DATE || '-' || gen_random_uuid()::TEXT,
    json_build_object('activity_type', activity_name, 'reward', actual_reward, 'monthly_total', monthly_total + actual_reward, 'monthly_remaining', remaining_cap - actual_reward),
    NOW()
  );

  RETURN json_build_object('success', true, 'reward_given', actual_reward, 'monthly_total', monthly_total + actual_reward, 'monthly_remaining', remaining_cap - actual_reward);
END;
$$;
