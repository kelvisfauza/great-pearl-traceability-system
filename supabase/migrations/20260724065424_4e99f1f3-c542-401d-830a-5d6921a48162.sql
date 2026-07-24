REVOKE ALL ON FUNCTION public.get_wallet_ledger_balance(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_wallet_ledger_balance(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_wallet_ledger_balance(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_wallet_ledger_balance(uuid) TO service_role;