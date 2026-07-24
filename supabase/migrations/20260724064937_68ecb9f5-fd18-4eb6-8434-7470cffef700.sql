CREATE OR REPLACE FUNCTION public.get_wallet_ledger_balance(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.ledger_entries
  WHERE user_id::text = p_user_id::text;
$$;

REVOKE ALL ON FUNCTION public.get_wallet_ledger_balance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wallet_ledger_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_wallet_ledger_balance(uuid) TO service_role;