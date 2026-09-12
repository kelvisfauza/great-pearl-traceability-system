CREATE OR REPLACE FUNCTION public.get_wallet_balance_before(p_user_id text, p_before timestamptz)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.ledger_entries
  WHERE user_id = p_user_id AND created_at < p_before
$$;
REVOKE ALL ON FUNCTION public.get_wallet_balance_before(text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_wallet_balance_before(text, timestamptz) TO service_role;