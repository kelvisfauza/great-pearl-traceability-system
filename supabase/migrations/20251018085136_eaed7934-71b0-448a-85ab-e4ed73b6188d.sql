-- Add fields for tracking multiple admin approvals
ALTER TABLE approval_requests 
ADD COLUMN IF NOT EXISTS admin_approved_1 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_approved_1_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_approved_1_by TEXT,
ADD COLUMN IF NOT EXISTS admin_approved_2 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_approved_2_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_approved_2_by TEXT,
ADD COLUMN IF NOT EXISTS requires_three_approvals BOOLEAN DEFAULT false;

-- Update existing function to handle three-tier approval
CREATE OR REPLACE FUNCTION public.process_money_request_three_tier_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Determine if request requires 3 approvals based on amount and type
  IF NEW.type = 'Employee Salary Request' AND NEW.amount > 150000 THEN
    NEW.requires_three_approvals := true;
  ELSIF NEW.type IN ('Expense Request', 'Money Request') AND NEW.amount > 70000 THEN
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
          current_balance = user_accounts.current_balance + NEW.amount,
          salary_approved = user_accounts.salary_approved + NEW.amount,
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
          current_balance = user_accounts.current_balance + NEW.amount,
          salary_approved = user_accounts.salary_approved + NEW.amount,
          updated_at = now();
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS money_request_three_tier_approval ON approval_requests;

-- Create new trigger
CREATE TRIGGER money_request_three_tier_approval
BEFORE UPDATE ON approval_requests
FOR EACH ROW
EXECUTE FUNCTION process_money_request_three_tier_approval();