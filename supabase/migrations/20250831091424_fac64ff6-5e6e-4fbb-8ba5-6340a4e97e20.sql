-- First, clean up the old activity reward system
DELETE FROM user_activity WHERE activity_type IN ('login', 'data_entry', 'form_submission', 'report_generation', 'task_completion', 'document_upload', 'transaction', 'daily_reward');

-- Clean up old activity-based functions (they will be recreated with proper salary logic)
DROP FUNCTION IF EXISTS award_daily_login_reward(uuid);
DROP FUNCTION IF EXISTS award_activity_reward(uuid, text);

-- Update the process_daily_salary_credits function to be more reliable
CREATE OR REPLACE FUNCTION public.process_daily_salary_credits()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  
  -- Process each active employee with proper auth_user_id
  FOR employee_record IN 
    SELECT id, auth_user_id, name, salary, email
    FROM public.employees 
    WHERE status = 'Active' 
    AND salary > 0
    AND auth_user_id IS NOT NULL
  LOOP
    -- Calculate daily credit based on actual days in current month
    daily_credit := public.calculate_daily_salary_credit(employee_record.salary);
    
    -- Check if credit already exists for today
    IF NOT EXISTS (
      SELECT 1 FROM public.ledger_entries 
      WHERE user_id = employee_record.auth_user_id::text
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
        employee_record.auth_user_id::text,
        'DAILY_SALARY',
        daily_credit,
        'DAILY-' || credit_date || '-' || employee_record.id,
        json_build_object(
          'employee_id', employee_record.id,
          'employee_name', employee_record.name,
          'monthly_salary', employee_record.salary,
          'credit_date', credit_date,
          'days_in_month', EXTRACT(DAY FROM (DATE_TRUNC('MONTH', credit_date) + INTERVAL '1 month' - INTERVAL '1 day'))
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

-- Ensure all employees have proper auth_user_id values
UPDATE employees 
SET auth_user_id = (
  CASE email
    WHEN 'denis@farmflow.ug' THEN 'JSxZYOSxmde6Cqra4clQNc92mRS2'::uuid
    WHEN 'nicholusscottlangz@gmail.com' THEN '5fe8c99d-ee15-484d-8765-9bd4b37f961f'::uuid
    -- Add other known mappings as needed
    ELSE auth_user_id
  END
)
WHERE auth_user_id IS NULL AND email IN ('denis@farmflow.ug', 'nicholusscottlangz@gmail.com');

-- Create a function to sync employee data between systems
CREATE OR REPLACE FUNCTION public.sync_employee_to_firebase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This trigger will help track when Supabase employee data changes
  -- The actual sync will be handled by the application layer
  
  -- Log the change for sync purposes
  INSERT INTO public.audit_logs (
    action,
    table_name,
    record_id,
    reason,
    performed_by,
    department,
    record_data
  ) VALUES (
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'supabase_employee_created'
      WHEN TG_OP = 'UPDATE' THEN 'supabase_employee_updated'
      WHEN TG_OP = 'DELETE' THEN 'supabase_employee_deleted'
    END,
    'employees',
    COALESCE(NEW.id::text, OLD.id::text),
    'Employee data changed in Supabase - needs Firebase sync',
    COALESCE(NEW.email, OLD.email, 'System'),
    'HR',
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for employee sync
DROP TRIGGER IF EXISTS sync_employee_changes ON employees;
CREATE TRIGGER sync_employee_changes
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_employee_to_firebase();