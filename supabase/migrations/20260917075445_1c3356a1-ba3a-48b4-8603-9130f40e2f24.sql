
CREATE TABLE IF NOT EXISTS public.loyalty_daily_accruals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  activity_type TEXT,
  form_name TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  accrual_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Africa/Kampala')::date),
  credited BOOLEAN NOT NULL DEFAULT false,
  credited_at TIMESTAMPTZ,
  ledger_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.loyalty_daily_accruals TO authenticated;
GRANT ALL ON public.loyalty_daily_accruals TO service_role;

ALTER TABLE public.loyalty_daily_accruals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own loyalty accruals" ON public.loyalty_daily_accruals;
CREATE POLICY "Users view own loyalty accruals" ON public.loyalty_daily_accruals
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Service role manages loyalty accruals" ON public.loyalty_daily_accruals;
CREATE POLICY "Service role manages loyalty accruals" ON public.loyalty_daily_accruals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_loyalty_accruals_user_date ON public.loyalty_daily_accruals (user_id, accrual_date);
CREATE INDEX IF NOT EXISTS idx_loyalty_accruals_pending ON public.loyalty_daily_accruals (accrual_date) WHERE credited = false;

DROP TRIGGER IF EXISTS trg_loyalty_accruals_updated_at ON public.loyalty_daily_accruals;
CREATE TRIGGER trg_loyalty_accruals_updated_at BEFORE UPDATE ON public.loyalty_daily_accruals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Award mode: 'daily' (collect and credit at 8pm), 'instant' (legacy), 'off' (suspended)
CREATE OR REPLACE FUNCTION public.loyalty_award_mode()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(
    (SELECT NULLIF(setting_value->>'mode','') FROM public.system_settings WHERE setting_key = 'loyalty_awards'),
    'daily')
$$;

UPDATE public.system_settings
SET setting_value = jsonb_build_object(
      'suspended', false,
      'mode', 'daily',
      'reason', 'Loyalty restored as an end-of-day wallet collection credited at 8pm',
      'restored_at', now()
    )
WHERE setting_key = 'loyalty_awards';

-- Unified view of loyalty-earning events (pending accruals + legacy instant ledger rewards)
CREATE OR REPLACE VIEW public.loyalty_award_events AS
  SELECT a.user_id, a.amount, a.activity_type, COALESCE(a.form_name,'') AS form_name, a.created_at
  FROM public.loyalty_daily_accruals a
  UNION ALL
  SELECT le.user_id, le.amount,
         (le.metadata::jsonb->>'activity_type') AS activity_type,
         COALESCE(le.metadata::jsonb->>'form_name','') AS form_name,
         le.created_at
  FROM public.ledger_entries le
  WHERE le.entry_type = 'LOYALTY_REWARD'
    AND COALESCE(le.metadata::jsonb->>'daily_batch','') <> 'true';

GRANT SELECT ON public.loyalty_award_events TO authenticated, service_role;

-- Divert instant reward inserts (incl. meeting bonuses) into the daily collection
CREATE OR REPLACE FUNCTION public.block_reward_entries_when_suspended()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.entry_type IN ('LOYALTY_REWARD','MEETING_ATTENDANCE_BONUS','HOST_MEETING_BONUS')
     AND COALESCE(NEW.metadata::jsonb->>'daily_batch','') <> 'true' THEN

    IF public.loyalty_awards_suspended() OR public.loyalty_award_mode() = 'off' THEN
      RETURN NULL;
    END IF;

    IF public.loyalty_award_mode() = 'daily' THEN
      INSERT INTO public.loyalty_daily_accruals (user_id, activity_type, form_name, amount, metadata)
      VALUES (
        NEW.user_id,
        COALESCE(NEW.metadata::jsonb->>'activity_type', lower(NEW.entry_type)),
        NULLIF(NEW.metadata::jsonb->>'form_name',''),
        NEW.amount,
        COALESCE(NEW.metadata::jsonb, '{}'::jsonb) || jsonb_build_object('entry_type', NEW.entry_type, 'reference', NEW.reference)
      );
      RETURN NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Activity rewards: same fair-use maths, but counted against the daily collection
CREATE OR REPLACE FUNCTION public.award_activity_reward_impl(user_uuid uuid, activity_name text, context jsonb DEFAULT '{}'::jsonb)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
  award_mode TEXT;
BEGIN
  award_mode := public.loyalty_award_mode();

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

  SELECT EXISTS (
    SELECT 1 FROM public.loyalty_award_events e
    WHERE e.user_id = user_uuid::TEXT
      AND e.activity_type = activity_name
      AND e.form_name = coalesce(ctx_form_name, '')
      AND e.created_at > NOW() - INTERVAL '3 minutes'
  ) INTO recent_same;

  IF recent_same THEN
    RETURN json_build_object('success', false, 'message', 'Cooldown active for ' || activity_name, 'reward_given', 0);
  END IF;

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
  FROM public.loyalty_award_events e
  WHERE e.user_id = user_uuid::TEXT
    AND e.activity_type = activity_name
    AND DATE(e.created_at) = CURRENT_DATE;

  IF today_activity_count >= activity_daily_limit THEN
    RETURN json_build_object('success', false, 'message', 'Daily limit reached for ' || activity_name, 'reward_given', 0);
  END IF;

  SELECT COUNT(*)::INTEGER INTO remaining_days
  FROM generate_series(CURRENT_DATE, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE, '1 day'::INTERVAL) d
  WHERE EXTRACT(DOW FROM d) != 0;
  IF remaining_days < 1 THEN remaining_days := 1; END IF;

  SELECT COALESCE(SUM(e.amount), 0) INTO monthly_total
  FROM public.loyalty_award_events e
  WHERE e.user_id = user_uuid::TEXT AND e.created_at >= month_start;

  remaining_cap := monthly_cap - monthly_total;
  IF remaining_cap <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Monthly cap reached', 'monthly_total', monthly_total, 'reward_given', 0);
  END IF;

  daily_budget := remaining_cap / remaining_days;
  absolute_daily_cap := monthly_cap / 22.0;

  SELECT COALESCE(SUM(e.amount), 0) INTO today_earned
  FROM public.loyalty_award_events e
  WHERE e.user_id = user_uuid::TEXT AND DATE(e.created_at) = CURRENT_DATE;

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

  IF award_mode = 'daily' THEN
    INSERT INTO public.loyalty_daily_accruals (user_id, activity_type, form_name, amount, metadata)
    VALUES (user_uuid::TEXT, activity_name, ctx_form_name, actual_reward, meta_payload);

    RETURN json_build_object('success', true, 'pending_daily_credit', true, 'reward_given', actual_reward,
      'monthly_total', monthly_total + actual_reward, 'monthly_remaining', remaining_cap - actual_reward);
  END IF;

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
  VALUES (user_uuid::TEXT, 'LOYALTY_REWARD', actual_reward,
    'LOYALTY-' || activity_name || ref_suffix || '-' || CURRENT_DATE || '-' || gen_random_uuid()::TEXT,
    meta_payload,
    NOW());

  RETURN json_build_object('success', true, 'reward_given', actual_reward, 'monthly_total', monthly_total + actual_reward, 'monthly_remaining', remaining_cap - actual_reward);
END;
$function$;

-- End-of-day credit: one wallet entry per person for the day's collection
CREATE OR REPLACE FUNCTION public.credit_daily_loyalty(p_date date DEFAULT NULL)
RETURNS TABLE(user_id text, total numeric, items integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  d DATE := COALESCE(p_date, (now() AT TIME ZONE 'Africa/Kampala')::date);
  r RECORD;
  ref TEXT;
BEGIN
  FOR r IN
    SELECT a.user_id AS uid, SUM(a.amount) AS total, COUNT(*)::int AS items
    FROM public.loyalty_daily_accruals a
    WHERE a.accrual_date = d AND a.credited = false
    GROUP BY a.user_id
    HAVING SUM(a.amount) > 0
  LOOP
    ref := 'LOYALTY-DAILY-' || d::text || '-' || left(r.uid, 8);

    IF NOT EXISTS (SELECT 1 FROM public.ledger_entries le WHERE le.reference = ref) THEN
      INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata, created_at)
      VALUES (r.uid, 'LOYALTY_REWARD', r.total, ref, 'SYSTEM_AWARD',
        jsonb_build_object(
          'daily_batch', true,
          'activity_count', r.items,
          'award_date', d,
          'description', 'Daily loyalty collection for ' || d::text
        ), now());
    END IF;

    UPDATE public.loyalty_daily_accruals a
    SET credited = true, credited_at = now(), ledger_reference = ref
    WHERE a.accrual_date = d AND a.credited = false AND a.user_id = r.uid;

    user_id := r.uid; total := r.total; items := r.items;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.credit_daily_loyalty(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_daily_loyalty(date) TO service_role;
