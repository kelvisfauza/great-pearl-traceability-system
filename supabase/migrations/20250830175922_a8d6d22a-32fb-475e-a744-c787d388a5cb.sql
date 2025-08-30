-- Create ledger entries for other employees based on their salaries
-- Calculate daily credits for employees and create historical entries

-- For Kibaba Nicholus (salary: 300,000)
-- Create 30 days of salary credits (10,000 per day for 300k monthly salary)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'kibaba_user_id', -- We'll use a temporary ID for now
  'DAILY_SALARY',
  10000.00, -- 300,000 / 30 days
  'DAILY-' || (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date || '-kibaba',
  json_build_object(
    'employee_name', 'Kibaba Nicholus',
    'monthly_salary', 300000,
    'credit_date', (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date
  ),
  (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date + TIME '08:00:00'
FROM generate_series(0, 29);

-- For Kusa Fauza (salary: 1,200,000)
-- Create 30 days of salary credits (40,000 per day for 1.2M monthly salary)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'kusa_fauza_user_id', -- We'll use a temporary ID for now
  'DAILY_SALARY',
  40000.00, -- 1,200,000 / 30 days
  'DAILY-' || (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date || '-kusa',
  json_build_object(
    'employee_name', 'Kusa Fauza',
    'monthly_salary', 1200000,
    'credit_date', (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date
  ),
  (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date + TIME '08:00:00'
FROM generate_series(0, 29);

-- For Admin User (salary: 300,000) - using their actual auth_user_id
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  '5fe8c99d-ee15-484d-8765-9bd4b37f961f',
  'DAILY_SALARY',
  10000.00, -- 300,000 / 30 days
  'DAILY-' || (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date || '-admin',
  json_build_object(
    'employee_name', 'Admin User',
    'monthly_salary', 300000,
    'credit_date', (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date
  ),
  (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date + TIME '08:00:00'
FROM generate_series(0, 29);

-- For Artwanzire Timothy (salary: 300,000) - using their actual auth_user_id
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641',
  'DAILY_SALARY',
  10000.00, -- 300,000 / 30 days
  'DAILY-' || (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date || '-artwanzire',
  json_build_object(
    'employee_name', 'Artwanzire Timothy',
    'monthly_salary', 300000,
    'credit_date', (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date
  ),
  (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date + TIME '08:00:00'
FROM generate_series(0, 29);

-- For HR Manager (salary: 800,000)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'hr_manager_user_id', -- We'll use a temporary ID for now
  'DAILY_SALARY',
  26666.67, -- 800,000 / 30 days
  'DAILY-' || (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date || '-hr',
  json_build_object(
    'employee_name', 'HR Manager',
    'monthly_salary', 800000,
    'credit_date', (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date
  ),
  (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date + TIME '08:00:00'
FROM generate_series(0, 29);

-- For Alex tumwine (salary: 300,000)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'alex_tumwine_user_id', -- We'll use a temporary ID for now
  'DAILY_SALARY',
  10000.00, -- 300,000 / 30 days
  'DAILY-' || (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date || '-alex',
  json_build_object(
    'employee_name', 'Alex tumwine',
    'monthly_salary', 300000,
    'credit_date', (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date
  ),
  (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date + TIME '08:00:00'
FROM generate_series(0, 29);

-- For Fauza Kusa 2 (salary: 500,000)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'fauza_kusa2_user_id', -- We'll use a temporary ID for now
  'DAILY_SALARY',
  16666.67, -- 500,000 / 30 days
  'DAILY-' || (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date || '-fauza2',
  json_build_object(
    'employee_name', 'Fauza Kusa 2',
    'monthly_salary', 500000,
    'credit_date', (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date
  ),
  (CURRENT_DATE - INTERVAL '30 days' + INTERVAL '1 day' * generate_series(0, 29))::date + TIME '08:00:00'
FROM generate_series(0, 29);