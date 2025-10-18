-- Fix the trigger function to remove user_id references
-- The approval_requests table doesn't have a user_id field

DROP TRIGGER IF EXISTS process_money_request_three_tier_approval_trigger ON approval_requests;

-- Recreate the trigger function without user balance updates
CREATE OR REPLACE FUNCTION public.process_money_request_three_tier_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Determine if request requires 3 approvals based on amount and type
  IF NEW.type = 'Employee Salary Request' AND NEW.amount > 150000 THEN
    NEW.requires_three_approvals := true;
  ELSIF NEW.type IN ('Expense Request', 'Money Request') AND NEW.amount > 70000 THEN
    NEW.requires_three_approvals := true;
  ELSE
    NEW.requires_three_approvals := false;
  END IF;

  -- Update status based on approvals (without user balance updates)
  IF NEW.requires_three_approvals THEN
    -- Need: finance + 2 admins
    IF NEW.finance_approved_at IS NOT NULL AND 
       NEW.admin_approved_1_at IS NOT NULL AND 
       NEW.admin_approved_2_at IS NOT NULL AND
       (OLD.status IS NULL OR OLD.status != 'Approved') THEN
      NEW.status := 'Approved';
    END IF;
  ELSE
    -- Standard 2-tier approval: finance + 1 admin
    IF NEW.finance_approved_at IS NOT NULL AND 
       NEW.admin_approved_at IS NOT NULL AND
       (OLD.status IS NULL OR OLD.status != 'Approved') THEN
      NEW.status := 'Approved';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER process_money_request_three_tier_approval_trigger
  BEFORE INSERT OR UPDATE ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION process_money_request_three_tier_approval();