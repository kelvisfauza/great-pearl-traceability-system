CREATE OR REPLACE FUNCTION public.award_activity_reward(user_uuid uuid, activity_name text)
RETURNS json
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
  last_same_activity TIMESTAMPTZ;
  today_page_visits INTEGER;
BEGIN
  month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  SELECT MAX(created_at) INTO last_same_activity
  FROM public.ledger_entries
  WHERE user_id = user_uuid::TEXT
    AND entry_type = 'LOYALTY_REWARD'
    AND (metadata::jsonb->>'activity_type') = activity_name
    AND created_at >= NOW() - INTERVAL '30 minutes';

  IF last_same_activity IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'Cooldown active', 'reward_given', 0);
  END IF;

  IF activity_name IN ('page_visit', 'interaction') THEN
    SELECT COUNT(*) INTO today_page_visits
    FROM public.ledger_entries
    WHERE user_id = user_uuid::TEXT
      AND entry_type = 'LOYALTY_REWARD'
      AND (metadata::jsonb->>'activity_type') IN ('page_visit', 'interaction')
      AND DATE(created_at) = CURRENT_DATE;

    IF today_page_visits >= 5 THEN
      RETURN json_build_object('success', false, 'message', 'Daily browsing limit reached', 'reward_given', 0);
    END IF;
  END IF;

  SELECT COUNT(*)::INTEGER INTO remaining_days
  FROM generate_series(CURRENT_DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE, '1 day'::INTERVAL) d
  WHERE EXTRACT(DOW FROM d) != 0;
  IF remaining_days < 1 THEN remaining_days := 1; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO monthly_total
  FROM public.ledger_entries
  WHERE user_id = user_uuid::TEXT AND entry_type = 'LOYALTY_REWARD' AND created_at >= month_start;

  remaining_cap := monthly_cap - monthly_total;
  IF remaining_cap <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Monthly cap reached', 'monthly_total', monthly_total, 'reward_given', 0);
  END IF;

  daily_budget := remaining_cap / remaining_days;

  SELECT COALESCE(SUM(amount), 0) INTO today_earned
  FROM public.ledger_entries
  WHERE user_id = user_uuid::TEXT AND entry_type = 'LOYALTY_REWARD' AND DATE(created_at) = CURRENT_DATE;

  today_budget := GREATEST(daily_budget - today_earned, 0);
  IF today_budget <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Daily budget used', 'monthly_total', monthly_total, 'reward_given', 0);
  END IF;

  CASE activity_name
    WHEN 'form_submission' THEN base_weight := 1.5;
    WHEN 'report_generation' THEN base_weight := 1.5;
    WHEN 'task_completion' THEN base_weight := 1.2;
    WHEN 'transaction' THEN base_weight := 1.2;
    WHEN 'data_entry' THEN base_weight := 0.8;
    WHEN 'document_upload' THEN base_weight := 0.8;
    WHEN 'page_visit' THEN base_weight := 0.05;
    WHEN 'interaction' THEN base_weight := 0.03;
    ELSE base_weight := 0.1;
  END CASE;

  actual_reward := ROUND((today_budget / 20.0) * base_weight);
  actual_reward := GREATEST(actual_reward, 1);
  actual_reward := LEAST(actual_reward, remaining_cap);
  actual_reward := LEAST(actual_reward, today_budget);

  UPDATE public.user_activity SET reward_amount = actual_reward
  WHERE id = (SELECT id FROM public.user_activity WHERE user_id = user_uuid AND activity_type = activity_name AND activity_date = CURRENT_DATE ORDER BY created_at DESC LIMIT 1);

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
  VALUES (user_uuid::TEXT, 'LOYALTY_REWARD', actual_reward,
    'LOYALTY-' || activity_name || '-' || CURRENT_DATE || '-' || gen_random_uuid()::TEXT,
    json_build_object('activity_type', activity_name, 'reward', actual_reward, 'monthly_total', monthly_total + actual_reward, 'monthly_remaining', remaining_cap - actual_reward),
    NOW());

  RETURN json_build_object('success', true, 'reward_given', actual_reward, 'monthly_total', monthly_total + actual_reward, 'monthly_remaining', remaining_cap - actual_reward);
END;
$$;