CREATE OR REPLACE FUNCTION public.award_activity_reward(user_uuid uuid, activity_name text, context jsonb DEFAULT '{}'::jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  monthly_total NUMERIC;
  monthly_cap NUMERIC;
  weight_multiplier NUMERIC;
  month_start DATE;
  remaining_cap NUMERIC;
  remaining_days INTEGER;
  daily_budget NUMERIC;
  today_earned NUMERIC;
  base_weight NUMERIC;
  actual_reward NUMERIC;
  today_budget NUMERIC;
  today_activity_count INTEGER;
  activity_daily_limit INTEGER;
  ctx_form_name TEXT;
  ctx_description TEXT;
  ctx_blob TEXT;
  is_finance_ops BOOLEAN := false;
  ref_suffix TEXT;
  meta_payload JSONB;
  per_action_cap NUMERIC;
  absolute_daily_cap NUMERIC;
  recent_same BOOLEAN;
BEGIN
  IF CURRENT_DATE >= DATE '2026-08-01' THEN
    monthly_cap := 120000;
    weight_multiplier := 3;
  ELSE
    monthly_cap := 50000;
    weight_multiplier := 1;
  END IF;

  month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  ctx_form_name := NULLIF(context->>'form_name', '');
  ctx_description := NULLIF(context->>'description', '');
  ctx_blob := lower(coalesce(ctx_form_name, '') || ' ' || coalesce(ctx_description, '') || ' ' || coalesce(context->>'page', ''));

  is_finance_ops := ctx_blob ~ '(paying supplier|supplier payment|payment receipt|grn|payout|disburse)';

  -- Anti-spam cooldown: same activity type (and form) within the last 3 minutes earns nothing
  SELECT EXISTS (
    SELECT 1 FROM public.ledger_entries
    WHERE user_id = user_uuid::TEXT
      AND entry_type = 'LOYALTY_REWARD'
      AND (metadata::jsonb->>'activity_type') = activity_name
      AND coalesce(metadata::jsonb->>'form_name', '') = coalesce(ctx_form_name, '')
      AND created_at > NOW() - INTERVAL '3 minutes'
  ) INTO recent_same;

  IF recent_same THEN
    RETURN json_build_object('success', false, 'message', 'Cooldown active for ' || activity_name, 'reward_given', 0);
  END IF;

  -- Fair-use daily count limits per activity type
  activity_daily_limit := CASE activity_name
    WHEN 'page_visit' THEN 5
    WHEN 'interaction' THEN 5
    WHEN 'chat_message' THEN 10
    WHEN 'voice_call' THEN 4
    WHEN 'group_meeting' THEN 3
    WHEN 'departmental_meeting' THEN 2
    WHEN 'form_submission' THEN 8
    WHEN 'report_generation' THEN 5
    WHEN 'transaction' THEN 10
    WHEN 'task_completion' THEN 8
    WHEN 'data_entry' THEN 10
    WHEN 'document_upload' THEN 5
    ELSE 5
  END;

  SELECT COUNT(*) INTO today_activity_count
  FROM public.ledger_entries
  WHERE user_id = user_uuid::TEXT
    AND entry_type = 'LOYALTY_REWARD'
    AND (metadata::jsonb->>'activity_type') = activity_name
    AND DATE(created_at) = CURRENT_DATE;

  IF today_activity_count >= activity_daily_limit THEN
    RETURN json_build_object('success', false, 'message', 'Daily limit reached for ' || activity_name, 'reward_given', 0);
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
  absolute_daily_cap := monthly_cap / 22.0;

  SELECT COALESCE(SUM(amount), 0) INTO today_earned
  FROM public.ledger_entries
  WHERE user_id = user_uuid::TEXT AND entry_type = 'LOYALTY_REWARD' AND DATE(created_at) = CURRENT_DATE;

  today_budget := LEAST(
    (CASE WHEN is_finance_ops THEN daily_budget * 1.5 ELSE daily_budget END),
    absolute_daily_cap
  ) - today_earned;

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
    WHEN 'chat_message' THEN base_weight := 0.4;
    WHEN 'voice_call' THEN base_weight := 2.5;
    WHEN 'group_meeting' THEN base_weight := 3.5;
    WHEN 'departmental_meeting' THEN base_weight := 4.5;
    ELSE base_weight := 0.1;
  END CASE;

  base_weight := base_weight * weight_multiplier;

  IF is_finance_ops AND activity_name IN ('transaction', 'report_generation', 'form_submission', 'task_completion') THEN
    base_weight := base_weight * 2;
  END IF;

  actual_reward := ROUND((today_budget / 20.0) * base_weight);

  per_action_cap := CASE
    WHEN is_finance_ops AND activity_name IN ('transaction', 'report_generation', 'form_submission', 'task_completion') THEN 600
    WHEN activity_name IN ('voice_call', 'group_meeting', 'departmental_meeting') THEN 500
    ELSE 250
  END;

  IF is_finance_ops AND activity_name IN ('transaction', 'report_generation') THEN
    actual_reward := GREATEST(actual_reward, 150);
  END IF;

  actual_reward := LEAST(actual_reward, per_action_cap);
  actual_reward := GREATEST(ROUND(actual_reward), 1);
  actual_reward := LEAST(actual_reward, remaining_cap);
  actual_reward := LEAST(actual_reward, today_budget);
  actual_reward := ROUND(actual_reward);

  UPDATE public.user_activity SET reward_amount = actual_reward
  WHERE id = (SELECT id FROM public.user_activity WHERE user_id = user_uuid AND activity_type = activity_name AND activity_date = CURRENT_DATE ORDER BY created_at DESC LIMIT 1);

  meta_payload := jsonb_build_object(
    'activity_type', activity_name,
    'reward', actual_reward,
    'monthly_total', monthly_total + actual_reward,
    'monthly_remaining', remaining_cap - actual_reward,
    'cap', monthly_cap,
    'per_action_cap', per_action_cap,
    'daily_ceiling', absolute_daily_cap,
    'multiplier', weight_multiplier,
    'finance_ops', is_finance_ops
  );
  IF ctx_form_name IS NOT NULL THEN
    meta_payload := meta_payload || jsonb_build_object('form_name', ctx_form_name);
  END IF;
  IF ctx_description IS NOT NULL THEN
    meta_payload := meta_payload || jsonb_build_object('description', ctx_description);
  END IF;

  ref_suffix := CASE
    WHEN ctx_form_name IS NOT NULL
      THEN '-' || regexp_replace(lower(ctx_form_name), '[^a-z0-9]+', '_', 'g')
    ELSE ''
  END;

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
  VALUES (user_uuid::TEXT, 'LOYALTY_REWARD', actual_reward,
    'LOYALTY-' || activity_name || ref_suffix || '-' || CURRENT_DATE || '-' || gen_random_uuid()::TEXT,
    meta_payload,
    NOW());

  RETURN json_build_object('success', true, 'reward_given', actual_reward, 'monthly_total', monthly_total + actual_reward, 'monthly_remaining', remaining_cap - actual_reward);
END;
$$;