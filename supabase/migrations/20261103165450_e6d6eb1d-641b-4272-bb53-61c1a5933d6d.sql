ALTER FUNCTION public.trg_check_treasury_funds() SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.trg_check_treasury_funds() FROM PUBLIC, anon, authenticated;