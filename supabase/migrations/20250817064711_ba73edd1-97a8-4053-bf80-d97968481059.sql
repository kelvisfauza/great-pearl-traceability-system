-- Create function to award rewards for various activities
CREATE OR REPLACE FUNCTION public.award_activity_reward(user_uuid uuid, activity_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reward_amount numeric := 5000;
  today_date date := CURRENT_DATE;
  already_rewarded boolean;
  activity_count integer;
  result json;
BEGIN
  -- Check if user already received reward today for ANY activity
  SELECT EXISTS(
    SELECT 1 FROM public.user_activity 
    WHERE user_id = user_uuid 
    AND activity_date = today_date 
    AND activity_type = 'activity_reward'
  ) INTO already_rewarded;
  
  IF already_rewarded THEN
    RETURN json_build_object('rewarded', false, 'reason', 'Already rewarded today');
  END IF;
  
  -- Count meaningful activities today (excluding login and reward activities)
  SELECT COUNT(*) INTO activity_count
  FROM public.user_activity 
  WHERE user_id = user_uuid 
  AND activity_date = today_date 
  AND activity_type NOT IN ('login', 'daily_reward', 'activity_reward');
  
  -- Award if user has performed any meaningful activity today
  IF activity_count >= 1 THEN
    -- Insert reward activity
    INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
    VALUES (user_uuid, 'activity_reward', today_date, reward_amount);
    
    -- Update user balance
    INSERT INTO public.user_accounts (user_id, current_balance, total_earned)
    VALUES (user_uuid, reward_amount, reward_amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      current_balance = user_accounts.current_balance + reward_amount,
      total_earned = user_accounts.total_earned + reward_amount,
      updated_at = now();
    
    RETURN json_build_object('rewarded', true, 'amount', reward_amount);
  ELSE
    RETURN json_build_object('rewarded', false, 'reason', 'No qualifying activities yet');
  END IF;
END;
$$;