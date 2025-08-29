-- Update Denis's employee record with correct auth_user_id from auth.users
UPDATE public.employees 
SET auth_user_id = (SELECT id FROM auth.users WHERE email = 'bwambaledenis8@gmail.com')
WHERE email = 'bwambaledenis8@gmail.com';

-- Now create Denis's user account with appropriate funds
INSERT INTO public.user_accounts (user_id, current_balance, total_earned, salary_approved)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'bwambaledenis8@gmail.com'),
  75000, -- Current balance
  75000, -- Total earned from activities
  0      -- No salary approved yet
);

-- Add historical activity records for Denis
-- Login activities (daily for past 30 days)
INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'bwambaledenis8@gmail.com'),
  'login',
  CURRENT_DATE - generate_series(1, 30),
  500;

-- Data entry activities (100 total entries with 200 each)
INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'bwambaledenis8@gmail.com'),
  'data_entry',
  CURRENT_DATE - (random() * 20)::integer,
  200
FROM generate_series(1, 100);

-- Form submissions (45 total with 300 each)
INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'bwambaledenis8@gmail.com'),
  'form_submission',
  CURRENT_DATE - (random() * 15)::integer,
  300
FROM generate_series(1, 45);

-- Report generation activities (20 total with 400 each)
INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'bwambaledenis8@gmail.com'),
  'report_generation',
  CURRENT_DATE - (random() * 10)::integer,
  400
FROM generate_series(1, 20);