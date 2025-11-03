-- Fix the weekly allowance calculation to properly handle Monday-Saturday weeks
-- and create allowances for current week based on attendance

-- Drop and recreate the calculate_weekly_allowance trigger function with correct week calculation
CREATE OR REPLACE FUNCTION public.calculate_weekly_allowance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  week_start DATE;
  week_end DATE;
  days_count INTEGER;
  daily_rate NUMERIC := 2500; -- 15000 / 6 days (Monday to Saturday)
BEGIN
  -- Calculate the week start (Monday) and end (Saturday) for the attendance date
  -- EXTRACT(ISODOW ...) returns 1=Monday, 7=Sunday
  week_start := NEW.date - ((EXTRACT(ISODOW FROM NEW.date)::INTEGER - 1) || ' days')::INTERVAL;
  week_end := week_start + INTERVAL '5 days'; -- Monday + 5 = Saturday
  
  -- Count present days for this employee in this week (Monday to Saturday only)
  SELECT COUNT(*)
  INTO days_count
  FROM attendance
  WHERE employee_id = NEW.employee_id
    AND date >= week_start
    AND date <= week_end
    AND status = 'present'
    AND EXTRACT(ISODOW FROM date) BETWEEN 1 AND 6; -- Monday to Saturday only
  
  -- Insert or update weekly allowance
  INSERT INTO weekly_allowances (
    employee_id,
    employee_name,
    employee_email,
    week_start_date,
    week_end_date,
    days_attended,
    total_eligible_amount,
    balance_available,
    amount_requested,
    updated_at
  )
  VALUES (
    NEW.employee_id,
    NEW.employee_name,
    NEW.employee_email,
    week_start,
    week_end,
    days_count,
    days_count * daily_rate,
    days_count * daily_rate,
    0,
    now()
  )
  ON CONFLICT (employee_id, week_start_date)
  DO UPDATE SET
    days_attended = days_count,
    total_eligible_amount = days_count * daily_rate,
    -- Preserve amount_requested, only update balance
    balance_available = days_count * daily_rate - weekly_allowances.amount_requested,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create function to refresh allowances for current week for all employees
CREATE OR REPLACE FUNCTION public.refresh_current_week_allowances()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  week_start DATE;
  week_end DATE;
  employee_record RECORD;
  days_count INTEGER;
  daily_rate NUMERIC := 2500;
  processed_count INTEGER := 0;
BEGIN
  -- Calculate current week (Monday to Saturday)
  week_start := CURRENT_DATE - ((EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER - 1) || ' days')::INTERVAL;
  week_end := week_start + INTERVAL '5 days';
  
  -- Process each employee who has attendance records this week
  FOR employee_record IN 
    SELECT DISTINCT 
      employee_id,
      employee_name,
      employee_email
    FROM attendance
    WHERE date >= week_start 
    AND date <= week_end
  LOOP
    -- Count their present days
    SELECT COUNT(*)
    INTO days_count
    FROM attendance
    WHERE employee_id = employee_record.employee_id
      AND date >= week_start
      AND date <= week_end
      AND status = 'present'
      AND EXTRACT(ISODOW FROM date) BETWEEN 1 AND 6;
    
    -- Insert or update their allowance
    INSERT INTO weekly_allowances (
      employee_id,
      employee_name,
      employee_email,
      week_start_date,
      week_end_date,
      days_attended,
      total_eligible_amount,
      balance_available,
      amount_requested,
      updated_at
    )
    VALUES (
      employee_record.employee_id,
      employee_record.employee_name,
      employee_record.employee_email,
      week_start,
      week_end,
      days_count,
      days_count * daily_rate,
      days_count * daily_rate,
      0,
      now()
    )
    ON CONFLICT (employee_id, week_start_date)
    DO UPDATE SET
      days_attended = days_count,
      total_eligible_amount = days_count * daily_rate,
      balance_available = days_count * daily_rate - weekly_allowances.amount_requested,
      updated_at = now();
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Current week allowances refreshed',
    'week_start', week_start,
    'week_end', week_end,
    'processed_count', processed_count
  );
END;
$$;

-- Refresh current week allowances immediately
SELECT public.refresh_current_week_allowances();