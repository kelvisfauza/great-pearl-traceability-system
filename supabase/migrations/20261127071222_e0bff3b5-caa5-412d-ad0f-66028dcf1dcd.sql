DO $$
DECLARE d text;
BEGIN
 d:=pg_get_functiondef('public.trg_check_treasury_funds'::regproc);
 d:=replace(d,$q$'wallet_transfer_reversal'
  ) THEN$q$,$q$'wallet_transfer_reversal','salary_advance_recovery'
  ) THEN$q$);
 IF position('salary_advance_recovery' in d)=0 THEN RAISE EXCEPTION 'check patch failed'; END IF;
 EXECUTE d;
 d:=pg_get_functiondef('public.trg_ledger_to_treasury'::regproc);
 d:=replace(d,$q$AND v_desc ILIKE 'Admin debit:%' THEN$q$,$q$AND v_desc ILIKE 'Admin debit:%' OR (v_direction = 'debit' AND v_meta_type = 'salary_advance_recovery') THEN$q$);
 IF position('salary_advance_recovery' in d)=0 THEN RAISE EXCEPTION 'pool patch failed'; END IF;
 EXECUTE d;
END $$;