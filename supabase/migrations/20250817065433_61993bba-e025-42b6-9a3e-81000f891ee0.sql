-- Add two-step approval fields to money_requests table
ALTER TABLE public.money_requests 
ADD COLUMN finance_approved_at timestamp with time zone,
ADD COLUMN finance_approved_by text,
ADD COLUMN admin_approved_at timestamp with time zone,
ADD COLUMN admin_approved_by text,
ADD COLUMN approval_stage text NOT NULL DEFAULT 'pending_finance',
ADD COLUMN payment_slip_generated boolean DEFAULT false,
ADD COLUMN payment_slip_number text;

-- Update the existing trigger to only process when both approvals are complete
DROP TRIGGER IF EXISTS process_money_request_approval_trigger ON public.money_requests;

CREATE OR REPLACE FUNCTION public.process_money_request_two_step_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only process if status changed to approved AND both finance and admin have approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND 
     NEW.finance_approved_at IS NOT NULL AND 
     NEW.admin_approved_at IS NOT NULL THEN
    
    -- Update user balance
    INSERT INTO public.user_accounts (user_id, current_balance, salary_approved)
    VALUES (NEW.user_id, NEW.amount, NEW.amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      current_balance = user_accounts.current_balance + NEW.amount,
      salary_approved = user_accounts.salary_approved + NEW.amount,
      updated_at = now();
      
    -- Generate payment slip number if not exists
    IF NEW.payment_slip_number IS NULL THEN
      NEW.payment_slip_number = 'PS' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(NEW.id::text, 8, '0');
      NEW.payment_slip_generated = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create new trigger
CREATE TRIGGER process_money_request_two_step_approval_trigger
  BEFORE UPDATE ON public.money_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.process_money_request_two_step_approval();