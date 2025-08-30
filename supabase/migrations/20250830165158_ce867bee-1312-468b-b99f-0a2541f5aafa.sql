-- Create function to calculate daily salary credit
CREATE OR REPLACE FUNCTION public.calculate_daily_salary_credit(employee_salary NUMERIC)
RETURNS NUMERIC 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
BEGIN
  -- Divide monthly salary by 26 working days (excluding Sundays)
  -- Assuming 4 weeks with 6.5 working days per week on average
  RETURN ROUND(employee_salary / 26, 2);
END;
$$;

-- Create function to process daily salary credits for all active employees
CREATE OR REPLACE FUNCTION public.process_daily_salary_credits()
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  employee_record RECORD;
  daily_credit NUMERIC;
  processed_count INTEGER := 0;
  today_is_sunday BOOLEAN;
  credit_date DATE := CURRENT_DATE;
BEGIN
  -- Check if today is Sunday (0 = Sunday in PostgreSQL)
  today_is_sunday := EXTRACT(DOW FROM credit_date) = 0;
  
  -- Don't process on Sundays
  IF today_is_sunday THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No salary credits processed on Sunday',
      'date', credit_date,
      'processed_count', 0
    );
  END IF;
  
  -- Process each active employee
  FOR employee_record IN 
    SELECT id, auth_user_id, name, salary, email
    FROM public.employees 
    WHERE status = 'Active' 
    AND salary > 0
    AND auth_user_id IS NOT NULL
  LOOP
    -- Calculate daily credit
    daily_credit := public.calculate_daily_salary_credit(employee_record.salary);
    
    -- Check if credit already exists for today
    IF NOT EXISTS (
      SELECT 1 FROM public.ledger_entries 
      WHERE user_id = employee_record.auth_user_id 
      AND entry_type = 'DAILY_SALARY'
      AND DATE(created_at) = credit_date
    ) THEN
      -- Add daily salary credit to ledger
      INSERT INTO public.ledger_entries (
        user_id,
        entry_type,
        amount,
        reference,
        metadata,
        created_at
      ) VALUES (
        employee_record.auth_user_id,
        'DAILY_SALARY',
        daily_credit,
        'DAILY-' || credit_date || '-' || employee_record.id,
        json_build_object(
          'employee_id', employee_record.id,
          'employee_name', employee_record.name,
          'monthly_salary', employee_record.salary,
          'credit_date', credit_date
        ),
        credit_date + TIME '08:00:00' -- Credit at 8 AM
      );
      
      processed_count := processed_count + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Daily salary credits processed successfully',
    'date', credit_date,
    'processed_count', processed_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error processing daily salary credits: ' || SQLERRM,
      'date', credit_date,
      'processed_count', processed_count
    );
END;
$$;

-- Create function to manually trigger salary credits for a specific date
CREATE OR REPLACE FUNCTION public.process_salary_credits_for_date(target_date DATE)
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  employee_record RECORD;
  daily_credit NUMERIC;
  processed_count INTEGER := 0;
  target_is_sunday BOOLEAN;
BEGIN
  -- Check if target date is Sunday
  target_is_sunday := EXTRACT(DOW FROM target_date) = 0;
  
  -- Don't process on Sundays
  IF target_is_sunday THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No salary credits processed on Sunday',
      'date', target_date,
      'processed_count', 0
    );
  END IF;
  
  -- Process each active employee for the target date
  FOR employee_record IN 
    SELECT id, auth_user_id, name, salary, email
    FROM public.employees 
    WHERE status = 'Active' 
    AND salary > 0
    AND auth_user_id IS NOT NULL
  LOOP
    -- Calculate daily credit
    daily_credit := public.calculate_daily_salary_credit(employee_record.salary);
    
    -- Check if credit already exists for target date
    IF NOT EXISTS (
      SELECT 1 FROM public.ledger_entries 
      WHERE user_id = employee_record.auth_user_id 
      AND entry_type = 'DAILY_SALARY'
      AND DATE(created_at) = target_date
    ) THEN
      -- Add daily salary credit to ledger
      INSERT INTO public.ledger_entries (
        user_id,
        entry_type,
        amount,
        reference,
        metadata,
        created_at
      ) VALUES (
        employee_record.auth_user_id,
        'DAILY_SALARY',
        daily_credit,
        'DAILY-' || target_date || '-' || employee_record.id,
        json_build_object(
          'employee_id', employee_record.id,
          'employee_name', employee_record.name,
          'monthly_salary', employee_record.salary,
          'credit_date', target_date
        ),
        target_date + TIME '08:00:00' -- Credit at 8 AM
      );
      
      processed_count := processed_count + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Daily salary credits processed successfully for ' || target_date,
    'date', target_date,
    'processed_count', processed_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error processing daily salary credits: ' || SQLERRM,
      'date', target_date,
      'processed_count', processed_count
    );
END;
$$;