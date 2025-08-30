-- Update database functions to work with TEXT user IDs instead of UUID
DROP FUNCTION IF EXISTS public.get_wallet_balance(uuid);
DROP FUNCTION IF EXISTS public.get_pending_withdrawals(uuid);  
DROP FUNCTION IF EXISTS public.get_available_to_request(uuid);

CREATE OR REPLACE FUNCTION public.get_wallet_balance_text(user_uuid text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM public.ledger_entries WHERE user_id = user_uuid),
    0
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_pending_withdrawals_text(user_uuid text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM public.withdrawal_requests 
     WHERE user_id = user_uuid 
     AND status IN ('pending', 'approved', 'processing')),
    0
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_available_to_request_text(user_uuid text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  wallet_balance NUMERIC;
  pending_withdrawals NUMERIC;
BEGIN
  wallet_balance := public.get_wallet_balance_text(user_uuid);
  pending_withdrawals := public.get_pending_withdrawals_text(user_uuid);
  
  RETURN GREATEST(0, wallet_balance - pending_withdrawals);
END;
$function$;