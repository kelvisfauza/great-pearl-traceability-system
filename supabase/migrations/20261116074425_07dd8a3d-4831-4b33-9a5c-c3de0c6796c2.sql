CREATE SCHEMA IF NOT EXISTS wallet_accounts_private;
REVOKE ALL ON SCHEMA wallet_accounts_private FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA wallet_accounts_private TO authenticated,service_role;
ALTER FUNCTION public.get_wallet_account_identity(text) SET SCHEMA wallet_accounts_private;
ALTER FUNCTION public.get_wallet_transfer_recipients() SET SCHEMA wallet_accounts_private;
CREATE FUNCTION public.get_wallet_account_identity(p_email text DEFAULT NULL) RETURNS TABLE(name text,wallet_account_number text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$ SELECT * FROM wallet_accounts_private.get_wallet_account_identity(p_email) $$;
CREATE FUNCTION public.get_wallet_transfer_recipients() RETURNS TABLE(id uuid,name text,email text,phone text,wallet_account_number text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$ SELECT * FROM wallet_accounts_private.get_wallet_transfer_recipients() $$;
REVOKE ALL ON FUNCTION public.get_wallet_account_identity(text),public.get_wallet_transfer_recipients() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_wallet_account_identity(text),public.get_wallet_transfer_recipients() TO authenticated,service_role;