DO $$
DECLARE v_uid text; v_before numeric; v_after numeric; v_accounts jsonb; v_restored jsonb; v_ref text := 'WD-APPROVAL-check-'||gen_random_uuid()::text; v_id uuid;
BEGIN
 SELECT details->>'user_id' INTO v_uid FROM public.approval_requests WHERE lower(type)='withdrawal request' AND details->>'user_id' IS NOT NULL ORDER BY created_at DESC LIMIT 1;
 IF v_uid IS NULL THEN RAISE EXCEPTION 'No withdrawal wallet available to check'; END IF;
 BEGIN
  SELECT coalesce(sum(amount),0) INTO v_before FROM public.ledger_entries WHERE user_id=v_uid;
  SELECT jsonb_object_agg(code,balance) INTO v_accounts FROM public.treasury_accounts;
  INSERT INTO public.ledger_entries(user_id,entry_type,amount,reference,source_category,metadata) VALUES(v_uid,'WITHDRAWAL',-30000,v_ref,'WITHDRAWAL',jsonb_build_object('description','Rollback-only fee check','approval_request_id','rollback-check')) RETURNING id INTO v_id;
  ASSERT (SELECT amount FROM public.ledger_entries WHERE reference=v_ref||'-FEE')=-1100, 'Missing 1100 fee';
  SELECT sum(amount) INTO v_after FROM public.ledger_entries WHERE user_id=v_uid;
  ASSERT v_after=v_before-31100, 'Wallet must deduct principal and charge';
  DELETE FROM public.ledger_entries WHERE id=v_id;
  ASSERT NOT EXISTS(SELECT 1 FROM public.ledger_entries WHERE reference=v_ref||'-FEE'), 'Fee not restored';
  SELECT sum(amount) INTO v_after FROM public.ledger_entries WHERE user_id=v_uid;
  ASSERT v_after=v_before, 'Wallet not restored';
  SELECT jsonb_object_agg(code,balance) INTO v_restored FROM public.treasury_accounts;
  ASSERT v_restored=v_accounts, 'Treasury not restored';
  RAISE EXCEPTION USING ERRCODE='ZX001', MESSAGE='Rollback successful';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN RAISE NOTICE 'PASS: principal, fee and treasury restoration verified; all test writes rolled back'; END;
END $$;