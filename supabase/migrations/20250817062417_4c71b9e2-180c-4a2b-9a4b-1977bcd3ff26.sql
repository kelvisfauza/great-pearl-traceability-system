-- Create user accounts table for balance management
CREATE TABLE public.user_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  salary_approved numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create user activity tracking table
CREATE TABLE public.user_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL, -- 'login', 'task_completion', 'daily_reward'
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  reward_amount numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create money requests table
CREATE TABLE public.money_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  request_type text NOT NULL DEFAULT 'advance', -- 'advance', 'salary', 'bonus'
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  requested_by text NOT NULL,
  approved_by text,
  approved_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create withdrawal requests table
CREATE TABLE public.withdrawal_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  phone_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  transaction_id text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.money_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_accounts
CREATE POLICY "Users can view their own account" 
ON public.user_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own account" 
ON public.user_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert user accounts" 
ON public.user_accounts 
FOR INSERT 
WITH CHECK (true);

-- RLS policies for user_activity
CREATE POLICY "Users can view their own activity" 
ON public.user_activity 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity" 
ON public.user_activity 
FOR INSERT 
WITH CHECK (true);

-- RLS policies for money_requests
CREATE POLICY "Users can view their own money requests" 
ON public.money_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create money requests" 
ON public.money_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all money requests" 
ON public.money_requests 
FOR SELECT 
USING (is_current_user_admin());

CREATE POLICY "Admins can update money requests" 
ON public.money_requests 
FOR UPDATE 
USING (is_current_user_admin());

-- RLS policies for withdrawal_requests
CREATE POLICY "Users can view their own withdrawal requests" 
ON public.withdrawal_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawal requests" 
ON public.withdrawal_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal requests" 
ON public.withdrawal_requests 
FOR SELECT 
USING (is_current_user_admin());

CREATE POLICY "Admins can update withdrawal requests" 
ON public.withdrawal_requests 
FOR UPDATE 
USING (is_current_user_admin());

-- Function to create user account when user is created
CREATE OR REPLACE FUNCTION public.handle_new_user_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_accounts (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create user account on user signup
CREATE TRIGGER on_auth_user_created_account
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_account();

-- Function to award daily login reward
CREATE OR REPLACE FUNCTION public.award_daily_login_reward(user_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  login_count integer;
  reward_amount numeric := 5000;
  today_date date := CURRENT_DATE;
  already_rewarded boolean;
  result json;
BEGIN
  -- Check if user already received reward today
  SELECT EXISTS(
    SELECT 1 FROM public.user_activity 
    WHERE user_id = user_uuid 
    AND activity_date = today_date 
    AND activity_type = 'daily_reward'
  ) INTO already_rewarded;
  
  IF already_rewarded THEN
    RETURN json_build_object('rewarded', false, 'reason', 'Already rewarded today');
  END IF;
  
  -- Count logins today
  SELECT COUNT(*) INTO login_count
  FROM public.user_activity 
  WHERE user_id = user_uuid 
  AND activity_date = today_date 
  AND activity_type = 'login';
  
  -- Award if 3 or more logins
  IF login_count >= 3 THEN
    -- Insert reward activity
    INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
    VALUES (user_uuid, 'daily_reward', today_date, reward_amount);
    
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
    RETURN json_build_object('rewarded', false, 'reason', 'Need 3 logins minimum');
  END IF;
END;
$$;

-- Function to process money request approval
CREATE OR REPLACE FUNCTION public.process_money_request_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only process if status changed to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Update user balance
    INSERT INTO public.user_accounts (user_id, current_balance, salary_approved)
    VALUES (NEW.user_id, NEW.amount, NEW.amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      current_balance = user_accounts.current_balance + NEW.amount,
      salary_approved = user_accounts.salary_approved + NEW.amount,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for money request approval
CREATE TRIGGER on_money_request_approved
  AFTER UPDATE ON public.money_requests
  FOR EACH ROW 
  EXECUTE FUNCTION public.process_money_request_approval();

-- Add updated_at triggers
CREATE TRIGGER update_user_accounts_updated_at
  BEFORE UPDATE ON public.user_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_money_requests_updated_at
  BEFORE UPDATE ON public.money_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();