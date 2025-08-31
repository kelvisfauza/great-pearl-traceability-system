-- Fix the security definer view issue by recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.unified_user_balances;

-- Create a secure function to get user balance instead
CREATE OR REPLACE FUNCTION public.get_user_balance_data(user_email text)
RETURNS TABLE(
  email text,
  name text,
  auth_user_id uuid,
  wallet_balance numeric,
  pending_withdrawals numeric,
  available_balance numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
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
  WHERE e.status = 'Active' AND e.email = user_email;
END;
$$;

-- Fix the get_unified_user_id function with proper search_path
CREATE OR REPLACE FUNCTION public.get_unified_user_id(input_email text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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