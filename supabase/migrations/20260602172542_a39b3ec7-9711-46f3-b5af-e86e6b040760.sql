
GRANT SELECT, INSERT, UPDATE, DELETE ON public.overdraft_applications TO authenticated;
GRANT ALL ON public.overdraft_applications TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.overdraft_accounts TO authenticated;
GRANT ALL ON public.overdraft_accounts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.overdraft_transactions TO authenticated;
GRANT ALL ON public.overdraft_transactions TO service_role;
