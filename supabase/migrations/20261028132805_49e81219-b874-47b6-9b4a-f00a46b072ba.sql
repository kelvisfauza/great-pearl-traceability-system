CREATE OR REPLACE FUNCTION public.award_activity_reward(user_uuid uuid, activity_name text, context jsonb DEFAULT '{}'::jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only real work earns loyalty. Passive activities (page visits, button
  -- clicks, calls, meetings) earn nothing. Chat messages count as work.
  IF activity_name NOT IN (
    'form_submission',
    'data_entry',
    'excel_data_entry',
    'document_upload',
    'report_generation',
    'transaction',
    'task_completion',
    'chat_message'
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Activity not eligible for loyalty rewards', 'reward_given', 0);
  END IF;

  RETURN public.award_activity_reward_impl(user_uuid, activity_name, context);
END;
$$;