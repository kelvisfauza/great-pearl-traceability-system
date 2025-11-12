-- Fix meal/refreshment request system to ONLY use weekly allowance, not total wallet balance
-- This ensures users can only request up to 15k per week for meals/refreshments based on attendance

-- Create a check to ensure meal/refreshment requests don't exceed weekly allowance
CREATE OR REPLACE FUNCTION check_weekly_allowance_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_week_allowance RECORD;
  week_start DATE;
  request_amount NUMERIC;
BEGIN
  -- Only check for lunch_refreshment type requests
  IF NEW.request_type != 'lunch_refreshment' THEN
    RETURN NEW;
  END IF;

  -- Calculate current week start (Monday)
  week_start := CURRENT_DATE - ((EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER - 1) || ' days')::INTERVAL;

  -- Get current week allowance for this employee
  SELECT * INTO current_week_allowance
  FROM weekly_allowances
  WHERE employee_id = NEW.employee_id
    AND week_start_date = week_start;

  -- If no allowance found, reject
  IF current_week_allowance IS NULL THEN
    RAISE EXCEPTION 'No attendance-based allowance found for current week';
  END IF;

  -- Check if amount exceeds available balance
  IF NEW.amount > current_week_allowance.balance_available THEN
    RAISE EXCEPTION 'Request amount (%) exceeds available weekly allowance (%). You have attended % days this week.',
      NEW.amount, current_week_allowance.balance_available, current_week_allowance.days_attended;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for money_requests table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'money_requests') THEN
    DROP TRIGGER IF EXISTS check_lunch_allowance_trigger ON money_requests;
    CREATE TRIGGER check_lunch_allowance_trigger
    BEFORE INSERT ON money_requests
    FOR EACH ROW
    EXECUTE FUNCTION check_weekly_allowance_limit();
  END IF;
END $$;

-- Update the MoneyRequestModal component to clearly show:
-- 1. Weekly meal allowance (max 15k based on attendance)
-- 2. Daily salary balance (separate, for other expenses)
-- This migration adds the database-level check.