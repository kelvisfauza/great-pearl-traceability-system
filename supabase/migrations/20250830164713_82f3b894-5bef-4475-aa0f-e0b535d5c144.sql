-- Fix search path security issues for the functions we just created
CREATE OR REPLACE FUNCTION public.get_wallet_balance(user_uuid UUID)
RETURNS NUMERIC 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM public.ledger_entries WHERE user_id = user_uuid),
    0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_withdrawals(user_uuid UUID)
RETURNS NUMERIC 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM public.withdrawal_requests 
     WHERE user_id = user_uuid 
     AND status IN ('pending', 'approved', 'processing')),
    0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_available_to_request(user_uuid UUID)
RETURNS NUMERIC 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
DECLARE
  wallet_balance NUMERIC;
  pending_withdrawals NUMERIC;
BEGIN
  wallet_balance := public.get_wallet_balance(user_uuid);
  pending_withdrawals := public.get_pending_withdrawals(user_uuid);
  
  RETURN GREATEST(0, wallet_balance - pending_withdrawals);
END;
$$;