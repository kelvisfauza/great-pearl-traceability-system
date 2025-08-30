-- Update Denis to have 300,000 salary and link to auth account
UPDATE public.employees 
SET salary = 300000, auth_user_id = 'e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641'
WHERE name = 'Artwanzire Timothy' OR auth_user_id = 'e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641';

-- Clear Denis's existing ledger entries to start fresh
DELETE FROM public.ledger_entries WHERE user_id = 'e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641';

-- Update Denis's account balance to 0 to start fresh
UPDATE public.user_accounts 
SET current_balance = 0, total_earned = 0, total_withdrawn = 0 
WHERE user_id = 'e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641';

-- Update the daily salary calculation function to divide by actual days in month
CREATE OR REPLACE FUNCTION public.calculate_daily_salary_credit(employee_salary numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  days_in_current_month INTEGER;
BEGIN
  -- Get the actual number of days in the current month
  days_in_current_month := EXTRACT(DAY FROM (DATE_TRUNC('MONTH', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'));
  
  -- Divide monthly salary by actual days in month
  RETURN ROUND(employee_salary / days_in_current_month, 2);
END;
$function$;