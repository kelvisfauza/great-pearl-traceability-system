-- Create Denis's ledger entries with his Firebase ID for all 30 days of this month
-- First ensure Denis has salary credits for the current month
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
SELECT 
  'JSxZYOSxmde6Cqra4clQNc92mRS2' as user_id,
  'DAILY_SALARY' as entry_type,
  9677.42 as amount,  -- 300000 / 31 days in August
  'DAILY-' || generate_series::date || '-denis' as reference,
  json_build_object(
    'employee_name', 'Denis Bwambale',
    'monthly_salary', 300000,
    'credit_date', generate_series::date
  ) as metadata,
  generate_series::date + TIME '08:00:00' as created_at
FROM generate_series(
  '2025-08-01'::date,
  LEAST('2025-08-31'::date, CURRENT_DATE),
  '1 day'::interval
) generate_series
ON CONFLICT (user_id, reference) DO NOTHING;