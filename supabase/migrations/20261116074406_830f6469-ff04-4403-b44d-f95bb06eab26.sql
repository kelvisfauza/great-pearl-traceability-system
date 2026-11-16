CREATE SEQUENCE public.wallet_account_number_seq START WITH 10000001 NO CYCLE;
REVOKE ALL ON SEQUENCE public.wallet_account_number_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.wallet_account_number_seq TO service_role;
ALTER TABLE public.employees ADD COLUMN wallet_account_number text;
UPDATE public.employees SET wallet_account_number = 'GAC-' || nextval('public.wallet_account_number_seq')::text WHERE wallet_account_number IS NULL;
ALTER TABLE public.employees ALTER COLUMN wallet_account_number SET NOT NULL;
CREATE UNIQUE INDEX employees_wallet_account_number_key ON public.employees(wallet_account_number);
CREATE FUNCTION public.assign_wallet_account_number() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP = 'UPDATE' THEN
  IF NEW.wallet_account_number IS DISTINCT FROM OLD.wallet_account_number THEN RAISE EXCEPTION 'Wallet account numbers cannot be changed'; END IF;
 ELSE
  NEW.wallet_account_number := 'GAC-' || nextval('public.wallet_account_number_seq')::text;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.assign_wallet_account_number() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER assign_wallet_account_number BEFORE INSERT OR UPDATE OF wallet_account_number ON public.employees FOR EACH ROW EXECUTE FUNCTION public.assign_wallet_account_number();
CREATE FUNCTION public.get_wallet_account_identity(p_email text DEFAULT NULL) RETURNS TABLE(name text, wallet_account_number text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text := coalesce(p_email,auth.jwt()->>'email');
BEGIN
 IF NOT public.is_active_staff() THEN RAISE EXCEPTION 'Active staff sign-in required'; END IF;
 IF lower(v_email) IS DISTINCT FROM lower(auth.jwt()->>'email') AND NOT public.is_current_user_admin_by_role() THEN RAISE EXCEPTION 'You may only view your own wallet account'; END IF;
 RETURN QUERY SELECT e.name,e.wallet_account_number FROM public.employees e WHERE lower(e.email)=lower(v_email);
END $$;
REVOKE ALL ON FUNCTION public.get_wallet_account_identity(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_wallet_account_identity(text) TO authenticated,service_role;
CREATE FUNCTION public.get_wallet_transfer_recipients() RETURNS TABLE(id uuid,name text,email text,phone text,wallet_account_number text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_active_staff() THEN RAISE EXCEPTION 'Active staff sign-in required'; END IF;
 RETURN QUERY SELECT e.id,e.name,e.email,coalesce(e.phone,''),e.wallet_account_number FROM public.employees e WHERE lower(e.status)='active' AND NOT coalesce(e.disabled,false) ORDER BY e.name;
END $$;
REVOKE ALL ON FUNCTION public.get_wallet_transfer_recipients() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_wallet_transfer_recipients() TO authenticated,service_role;
COMMENT ON COLUMN public.employees.wallet_account_number IS 'Immutable display identifier for the employee wallet; never a bank account or payment authorization credential.';