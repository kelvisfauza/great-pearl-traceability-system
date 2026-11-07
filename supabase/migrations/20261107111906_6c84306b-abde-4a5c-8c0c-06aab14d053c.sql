CREATE OR REPLACE FUNCTION public.approval_withdrawal_fee_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_fee numeric; v_ref text; v_id uuid;
BEGIN
 IF NEW.entry_type <> 'WITHDRAWAL' OR NEW.amount >= 0 OR NOT (NEW.reference LIKE 'WD-APPROVAL-%' OR NEW.reference LIKE 'FIN-WD-%') OR NEW.source_category <> 'WITHDRAWAL' THEN RETURN NEW; END IF;
 v_fee := public.withdrawal_service_charge(abs(NEW.amount)); v_ref := NEW.reference || '-FEE';
 IF v_fee > 0 THEN
  INSERT INTO public.ledger_entries(user_id,entry_type,amount,reference,source_category,metadata)
  VALUES(NEW.user_id,'FEE',-v_fee,v_ref,'WITHDRAW_FEE',jsonb_build_object('type','withdraw_service_fee','approval_request_id',NEW.metadata->>'approval_request_id','withdrawal_ledger_id',NEW.id,'withdrawal_charge_atomic',true,'description','Withdrawal service charge: UGX ' || v_fee::text,'released_by',NEW.metadata->>'released_by')) RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Withdrawal service charge could not be recorded'; END IF;
 END IF; RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.approval_withdrawal_restore_delete() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record;
BEGIN
 IF NOT (((OLD.reference LIKE 'WD-APPROVAL-%' OR OLD.reference LIKE 'FIN-WD-%') AND OLD.source_category='WITHDRAWAL') OR coalesce(OLD.metadata->>'withdrawal_charge_atomic','false')='true') THEN RETURN OLD; END IF;
 FOR r IN SELECT * FROM public.treasury_account_entries WHERE ledger_entry_id=OLD.id ORDER BY created_at,id LOOP
  PERFORM public.treasury_account_post(r.account_code,CASE WHEN r.direction='debit' THEN 'credit' ELSE 'debit' END,r.amount,r.counter_account,'RESTORE-'||r.id::text,NULL,r.related_user_email,r.related_user_name,'Failed withdrawal returned: '||coalesce(r.description,''),'system',jsonb_build_object('reversed_entry_id',r.id,'withdrawal_ledger_id',OLD.id));
 END LOOP;
 IF OLD.source_category='WITHDRAWAL' THEN
  DELETE FROM public.ledger_entries WHERE reference=OLD.reference||'-FEE' AND user_id=OLD.user_id AND coalesce(metadata->>'withdrawal_charge_atomic','false')='true';
 END IF; RETURN OLD;
END; $$;