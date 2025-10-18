-- Step 1: Drop the problematic trigger
DROP TRIGGER IF EXISTS process_money_request_three_tier_approval_trigger ON approval_requests;

-- Step 2: Convert amount column from text to numeric
ALTER TABLE approval_requests 
ALTER COLUMN amount TYPE numeric USING 
  CASE 
    WHEN amount ~ '^[0-9]+\.?[0-9]*$' THEN amount::numeric
    ELSE 0
  END;

-- Step 3: Recreate the trigger function with proper numeric comparisons
CREATE OR REPLACE FUNCTION public.process_money_request_three_tier_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Determine if request requires 3 approvals based on amount and type
  IF NEW.type = 'Employee Salary Request' AND NEW.amount::numeric > 150000 THEN
    NEW.requires_three_approvals := true;
  ELSIF NEW.type IN ('Expense Request', 'Money Request') AND NEW.amount::numeric > 70000 THEN
    NEW.requires_three_approvals := true;
  ELSE
    NEW.requires_three_approvals := false;
  END IF;

  -- Only process if all required approvals are complete
  IF NEW.requires_three_approvals THEN
    -- Need: finance + 2 admins
    IF NEW.finance_approved_at IS NOT NULL AND 
       NEW.admin_approved_1_at IS NOT NULL AND 
       NEW.admin_approved_2_at IS NOT NULL AND
       OLD.status != 'approved' THEN
      
      NEW.status := 'Approved';
      
      -- Update user balance for salary/money requests
      IF NEW.type IN ('Employee Salary Request', 'Money Request') THEN
        INSERT INTO public.user_accounts (user_id, current_balance, salary_approved)
        VALUES (NEW.user_id, NEW.amount, NEW.amount)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          current_balance = user_accounts.current_balance + NEW.amount::numeric,
          salary_approved = user_accounts.salary_approved + NEW.amount::numeric,
          updated_at = now();
      END IF;
    END IF;
  ELSE
    -- Standard 2-tier approval: finance + 1 admin
    IF NEW.finance_approved_at IS NOT NULL AND 
       NEW.admin_approved_at IS NOT NULL AND
       OLD.status != 'approved' THEN
      
      NEW.status := 'Approved';
      
      -- Update user balance for salary/money requests
      IF NEW.type IN ('Employee Salary Request', 'Money Request') THEN
        INSERT INTO public.user_accounts (user_id, current_balance, salary_approved)
        VALUES (NEW.user_id, NEW.amount, NEW.amount)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          current_balance = user_accounts.current_balance + NEW.amount::numeric,
          salary_approved = user_accounts.salary_approved + NEW.amount::numeric,
          updated_at = now();
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Step 4: Recreate the trigger
CREATE TRIGGER process_money_request_three_tier_approval_trigger
  BEFORE INSERT OR UPDATE ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION process_money_request_three_tier_approval();