-- Run through the migration tool; all test employee writes roll back.
DO $$
DECLARE v_total bigint;v_unique bigint;v_id uuid;v_number text;v_new text;
BEGIN
 SELECT count(*),count(DISTINCT wallet_account_number) INTO v_total,v_unique FROM public.employees;
 IF v_total<>v_unique OR EXISTS(SELECT 1 FROM public.employees WHERE wallet_account_number IS NULL OR wallet_account_number !~ '^GAC-[0-9]{8,}$') THEN RAISE EXCEPTION 'Wallet number coverage/uniqueness failed'; END IF;
 SELECT id,wallet_account_number INTO v_id,v_number FROM public.employees ORDER BY id LIMIT 1;
 BEGIN
  UPDATE public.employees SET wallet_account_number='GAC-99999999' WHERE id=v_id;
  RAISE EXCEPTION 'immutability_test_failed';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'Wallet account numbers cannot be changed' THEN RAISE; END IF;
 END;
 BEGIN
  INSERT INTO public.employees(name,email,position,department,salary,status,wallet_account_number) VALUES('Wallet number test','wallet-number-test@example.invalid','test','test',0,'active',v_number) RETURNING wallet_account_number INTO v_new;
  IF v_new=v_number OR v_new !~ '^GAC-[0-9]{8,}$' THEN RAISE EXCEPTION 'New wallet allocation failed'; END IF;
  RAISE EXCEPTION 'rollback_wallet_number_test';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'rollback_wallet_number_test' THEN RAISE; END IF;
 END;
 IF has_function_privilege('anon','public.get_wallet_account_identity(text)','EXECUTE') OR has_function_privilege('anon','public.get_wallet_transfer_recipients()','EXECUTE') THEN RAISE EXCEPTION 'Anonymous wallet lookup allowed'; END IF;
END $$;