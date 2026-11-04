DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.prorettype <> 'trigger'::regtype
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
      AND p.proname ~* '(wallet|treasury|ledger|payout|withdraw|disburse|loan|salary|payroll|loyalty|bonus|refund|deposit|balance|fund|pay|overdraft|invest|credit|debit|deduct|award|claim|spendable|reward|allowance|advance|per_diem|momo|gosente|yo_|fee|cash|transfer|reversal|reverse)'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
  END LOOP;
END $$;