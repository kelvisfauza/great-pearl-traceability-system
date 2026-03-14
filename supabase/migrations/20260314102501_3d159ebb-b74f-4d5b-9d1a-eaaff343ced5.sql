CREATE OR REPLACE FUNCTION public.validate_withdrawal_balance(
  p_user_id uuid,
  p_amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
  v_pending numeric;
  v_available numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM ledger_entries
  WHERE user_id = p_user_id
    AND entry_type IN ('LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT');
  
  SELECT COALESCE(SUM(amount), 0) INTO v_pending
  FROM withdrawal_requests
  WHERE user_id = p_user_id::text
    AND status IN ('pending', 'processing', 'pending_approval', 'pending_admin_2', 'pending_admin_3', 'pending_finance');
  
  v_available := GREATEST(0, v_balance - v_pending);
  
  IF p_amount > v_available THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$