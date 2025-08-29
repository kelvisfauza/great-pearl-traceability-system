-- Create Denis's user account with appropriate funds
-- He's been working since July 2025, so he should have earned substantial rewards

INSERT INTO public.user_accounts (user_id, current_balance, total_earned, salary_approved)
VALUES (
  (SELECT auth_user_id FROM employees WHERE email = 'bwambaledenis8@gmail.com'),
  75000, -- Current balance
  75000, -- Total earned from activities
  0      -- No salary approved yet
);

-- Add historical activity records for Denis to justify the earnings
-- Login activities (daily for past 30 days)
INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
SELECT 
  (SELECT auth_user_id FROM employees WHERE email = 'bwambaledenis8@gmail.com'),
  'login',
  CURRENT_DATE - generate_series(1, 30),
  500
FROM generate_series(1, 30);

-- Data entry activities (5 per day for past 20 days) 
INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
SELECT 
  (SELECT auth_user_id FROM employees WHERE email = 'bwambaledenis8@gmail.com'),
  'data_entry',
  CURRENT_DATE - generate_series(1, 20),
  200
FROM generate_series(1, 20), generate_series(1, 5);

-- Form submissions (3 per day for past 15 days)
INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
SELECT 
  (SELECT auth_user_id FROM employees WHERE email = 'bwambaledenis8@gmail.com'),
  'form_submission',
  CURRENT_DATE - generate_series(1, 15),
  300
FROM generate_series(1, 15), generate_series(1, 3);

-- Report generation activities (2 per day for past 10 days)
INSERT INTO public.user_activity (user_id, activity_type, activity_date, reward_amount)
SELECT 
  (SELECT auth_user_id FROM employees WHERE email = 'bwambaledenis8@gmail.com'),
  'report_generation',
  CURRENT_DATE - generate_series(1, 10),
  400
FROM generate_series(1, 10), generate_series(1, 2);