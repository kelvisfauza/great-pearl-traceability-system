-- Create the award_activity_reward function
CREATE OR REPLACE FUNCTION public.award_activity_reward(user_uuid UUID, activity_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_account RECORD;
    daily_activities INTEGER;
    reward_amount NUMERIC := 0;
    max_daily_reward NUMERIC := 5000;
    base_reward NUMERIC := 500;
    result JSON;
BEGIN
    -- Get or create user account
    SELECT * INTO user_account 
    FROM user_accounts 
    WHERE user_id = user_uuid;
    
    IF user_account IS NULL THEN
        INSERT INTO user_accounts (user_id, current_balance, total_earned, total_withdrawn, salary_approved)
        VALUES (user_uuid, 0, 0, 0, 0)
        RETURNING * INTO user_account;
    END IF;
    
    -- Count today's activities for this user
    SELECT COUNT(*) INTO daily_activities
    FROM user_activity 
    WHERE user_id = user_uuid 
    AND activity_date = CURRENT_DATE
    AND reward_amount > 0;
    
    -- Check if user has reached daily limit
    SELECT COALESCE(SUM(reward_amount), 0) INTO reward_amount
    FROM user_activity 
    WHERE user_id = user_uuid 
    AND activity_date = CURRENT_DATE;
    
    -- If already at or above daily limit, no reward
    IF reward_amount >= max_daily_reward THEN
        RETURN json_build_object(
            'rewarded', false,
            'amount', 0,
            'reason', 'Daily reward limit reached'
        );
    END IF;
    
    -- Calculate reward based on activity type and daily count
    CASE activity_name
        WHEN 'login' THEN
            IF daily_activities = 0 THEN
                reward_amount := base_reward; -- First login of the day
            ELSE
                reward_amount := 0; -- No reward for multiple logins
            END IF;
        WHEN 'data_entry' THEN
            IF daily_activities < 5 THEN
                reward_amount := 200; -- Reward for first 5 data entries
            ELSE
                reward_amount := 0;
            END IF;
        WHEN 'form_submission' THEN
            IF daily_activities < 3 THEN
                reward_amount := 300; -- Reward for first 3 form submissions
            ELSE
                reward_amount := 0;
            END IF;
        WHEN 'report_generation' THEN
            reward_amount := 400; -- Always reward report generation
        WHEN 'task_completion' THEN
            reward_amount := 250; -- Always reward task completion
        WHEN 'document_upload' THEN
            reward_amount := 150; -- Always reward document upload
        WHEN 'transaction' THEN
            reward_amount := 350; -- Always reward transactions
        ELSE
            reward_amount := 100; -- Default reward for other activities
    END CASE;
    
    -- Ensure we don't exceed daily limit
    IF (SELECT COALESCE(SUM(reward_amount), 0) FROM user_activity WHERE user_id = user_uuid AND activity_date = CURRENT_DATE) + reward_amount > max_daily_reward THEN
        reward_amount := max_daily_reward - (SELECT COALESCE(SUM(reward_amount), 0) FROM user_activity WHERE user_id = user_uuid AND activity_date = CURRENT_DATE);
        IF reward_amount <= 0 THEN
            reward_amount := 0;
        END IF;
    END IF;
    
    -- If no reward, return early
    IF reward_amount <= 0 THEN
        RETURN json_build_object(
            'rewarded', false,
            'amount', 0,
            'reason', 'No reward for this activity or limit reached'
        );
    END IF;
    
    -- Update the most recent activity record with reward amount
    UPDATE user_activity 
    SET reward_amount = reward_amount
    WHERE user_id = user_uuid 
    AND activity_date = CURRENT_DATE 
    AND activity_type = activity_name
    AND reward_amount = 0
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Update user account balance
    UPDATE user_accounts 
    SET 
        current_balance = current_balance + reward_amount,
        total_earned = total_earned + reward_amount,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    RETURN json_build_object(
        'rewarded', true,
        'amount', reward_amount,
        'reason', 'Activity reward granted'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'rewarded', false,
            'amount', 0,
            'reason', 'Error: ' || SQLERRM
        );
END;
$$;