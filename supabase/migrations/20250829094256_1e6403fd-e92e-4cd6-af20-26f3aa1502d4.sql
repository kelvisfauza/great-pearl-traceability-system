-- Create Denis's account manually with a temporary UUID
-- First, let's create a user account for Denis with a generated UUID
WITH new_user_id AS (
  SELECT gen_random_uuid() as user_id
)
INSERT INTO public.user_accounts (user_id, current_balance, total_earned, salary_approved)
SELECT user_id, 75000, 75000, 0 FROM new_user_id;

-- Update Denis's employee record with the same UUID
UPDATE public.employees 
SET auth_user_id = (SELECT user_id FROM user_accounts WHERE current_balance = 75000 AND total_earned = 75000 LIMIT 1)
WHERE email = 'bwambaledenis8@gmail.com';

-- Add historical activity records for Denis using the user_id from user_accounts
WITH denis_user AS (
  SELECT user_id FROM user_accounts WHERE current_balance = 75000 AND total_earned = 75000 LIMIT 1
)
INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
SELECT 
  denis_user.user_id,
  'login',
  CURRENT_DATE - generate_series(1, 30),
  500
FROM denis_user, generate_series(1, 30);

-- Data entry activities
WITH denis_user AS (
  SELECT user_id FROM user_accounts WHERE current_balance = 75000 AND total_earned = 75000 LIMIT 1
)
INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
SELECT 
  denis_user.user_id,
  'data_entry',
  CURRENT_DATE - (random() * 20)::integer,
  200
FROM denis_user, generate_series(1, 100);

-- Form submissions
WITH denis_user AS (
  SELECT user_id FROM user_accounts WHERE current_balance = 75000 AND total_earned = 75000 LIMIT 1
)
INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
SELECT 
  denis_user.user_id,
  'form_submission',
  CURRENT_DATE - (random() * 15)::integer,
  300
FROM denis_user, generate_series(1, 45);

-- Report generation activities
WITH denis_user AS (
  SELECT user_id FROM user_accounts WHERE current_balance = 75000 AND total_earned = 75000 LIMIT 1
)
INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
SELECT 
  denis_user.user_id,
  'report_generation',
  CURRENT_DATE - (random() * 10)::integer,
  400
FROM denis_user, generate_series(1, 20);