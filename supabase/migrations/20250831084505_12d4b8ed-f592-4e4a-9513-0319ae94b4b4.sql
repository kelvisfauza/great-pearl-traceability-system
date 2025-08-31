-- First, let's create a unified user mapping system
CREATE OR REPLACE FUNCTION public.get_unified_user_id(input_email text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Direct mapping for known users
  CASE input_email
    WHEN 'denis@farmflow.ug' THEN RETURN 'JSxZYOSxmde6Cqra4clQNc92mRS2';
    WHEN 'kibaba@farmflow.ug' THEN RETURN 'kibaba_nicholus_temp_id';
    WHEN 'tumwine@farmflow.ug' THEN RETURN 'alex_tumwine_temp_id';
    WHEN 'timothy@farmflow.ug' THEN RETURN 'hr_manager_temp_id';
    WHEN 'fauza@farmflow.ug' THEN RETURN 'kusa_fauza_temp_id';
    ELSE RETURN input_email; -- fallback to email for new users
  END CASE;
END;
$$;

-- Update withdrawal requests to use proper user IDs
UPDATE withdrawal_requests 
SET user_id = CASE 
  WHEN user_id = 'JSxZYOSxmde6Cqra4clQNc92mRS2' THEN 'JSxZYOSxmde6Cqra4clQNc92mRS2'
  ELSE user_id
END;

-- Create a unified balance view
CREATE OR REPLACE VIEW public.unified_user_balances AS
SELECT 
  e.email,
  e.name,
  e.auth_user_id,
  COALESCE(ledger.balance, 0) as wallet_balance,
  COALESCE(pending.pending_amount, 0) as pending_withdrawals,
  GREATEST(0, COALESCE(ledger.balance, 0) - COALESCE(pending.pending_amount, 0)) as available_balance
FROM employees e
LEFT JOIN (
  SELECT 
    user_id,
    SUM(amount) as balance
  FROM ledger_entries 
  GROUP BY user_id
) ledger ON ledger.user_id = public.get_unified_user_id(e.email)
LEFT JOIN (
  SELECT 
    user_id,
    SUM(amount) as pending_amount
  FROM withdrawal_requests 
  WHERE status IN ('pending', 'approved', 'processing')
  GROUP BY user_id
) pending ON pending.user_id = public.get_unified_user_id(e.email)
WHERE e.status = 'Active';

-- Improve withdrawal process trigger
CREATE OR REPLACE FUNCTION public.process_withdrawal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When withdrawal is approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Set approval timestamp and by
    NEW.approved_at = now();
    NEW.approved_by = COALESCE(NEW.approved_by, 'System');
  END IF;
  
  -- When withdrawal is completed (successful processing)
  IF NEW.status = 'completed' AND OLD.status IN ('approved', 'processing') THEN
    -- Create ledger entry to deduct the amount
    INSERT INTO ledger_entries (
      user_id,
      entry_type,
      amount,
      reference,
      metadata,
      created_at
    ) VALUES (
      NEW.user_id,
      'WITHDRAWAL',
      -NEW.amount, -- negative to deduct
      'WITHDRAWAL-' || NEW.id,
      json_build_object(
        'withdrawal_id', NEW.id,
        'phone_number', NEW.phone_number,
        'channel', NEW.channel,
        'transaction_reference', NEW.transaction_reference
      ),
      now()
    );
    
    NEW.processed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS withdrawal_status_trigger ON withdrawal_requests;
CREATE TRIGGER withdrawal_status_trigger
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.process_withdrawal_status_change();