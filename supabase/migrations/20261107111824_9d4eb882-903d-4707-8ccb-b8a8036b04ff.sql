CREATE OR REPLACE FUNCTION public.withdrawal_service_charge(p_amount numeric) RETURNS numeric LANGUAGE sql STABLE SET search_path=public AS $$ SELECT CASE WHEN p_amount < 500 THEN 0 WHEN p_amount <= 60000 THEN 1100 WHEN p_amount <= 500000 THEN 1700 WHEN p_amount <= 1000000 THEN 2500 ELSE 2900 END; $$;
REVOKE ALL ON FUNCTION public.withdrawal_service_charge(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdrawal_service_charge(numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.approval_withdrawal_fee_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_fee numeric; v_ref text; v_id uuid;
BEGIN
 IF NEW.entry_type <> 'WITHDRAWAL' OR NEW.amount >= 0 OR NEW.reference NOT LIKE 'WD-APPROVAL-%' OR NEW.source_category <> 'WITHDRAWAL' THEN RETURN NEW; END IF;
 v_fee := public.withdrawal_service_charge(abs(NEW.amount));
 v_ref := NEW.reference || '-FEE';
 IF v_fee > 0 THEN
  INSERT INTO public.ledger_entries(user_id,entry_type,amount,reference,source_category,metadata)
  VALUES(NEW.user_id,'FEE',-v_fee,v_ref,'WITHDRAW_FEE',jsonb_build_object('type','withdraw_service_fee','approval_request_id',NEW.metadata->>'approval_request_id','withdrawal_ledger_id',NEW.id,'withdrawal_charge_atomic',true,'description','Withdrawal service charge: UGX ' || v_fee::text,'released_by',NEW.metadata->>'released_by')) RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Withdrawal service charge could not be recorded'; END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.approval_withdrawal_fee_insert() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approval_withdrawal_fee_insert() TO service_role;
CREATE TRIGGER zzz_approval_withdrawal_fee_insert AFTER INSERT ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.approval_withdrawal_fee_insert();

CREATE OR REPLACE FUNCTION public.approval_withdrawal_restore_delete() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record;
BEGIN
 IF NOT ((OLD.reference LIKE 'WD-APPROVAL-%' AND OLD.source_category='WITHDRAWAL') OR coalesce(OLD.metadata->>'withdrawal_charge_atomic','false')='true') THEN RETURN OLD; END IF;
 FOR r IN SELECT * FROM public.treasury_account_entries WHERE ledger_entry_id=OLD.id ORDER BY created_at,id LOOP
  PERFORM public.treasury_account_post(r.account_code,CASE WHEN r.direction='debit' THEN 'credit' ELSE 'debit' END,r.amount,r.counterparty_code,'RESTORE-'||r.id::text,NULL,r.related_user_email,r.related_user_name,'Failed withdrawal returned: '||coalesce(r.description,''),'system',jsonb_build_object('reversed_entry_id',r.id,'withdrawal_ledger_id',OLD.id));
 END LOOP;
 IF OLD.source_category='WITHDRAWAL' THEN
  DELETE FROM public.ledger_entries WHERE reference=OLD.reference||'-FEE' AND user_id=OLD.user_id AND coalesce(metadata->>'withdrawal_charge_atomic','false')='true';
 END IF;
 RETURN OLD;
END; $$;
REVOKE ALL ON FUNCTION public.approval_withdrawal_restore_delete() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.approval_withdrawal_restore_delete() TO service_role;
CREATE TRIGGER zzz_approval_withdrawal_restore_delete AFTER DELETE ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.approval_withdrawal_restore_delete();
DO $$ BEGIN
 ASSERT public.withdrawal_service_charge(30000)=1100;
 ASSERT public.withdrawal_service_charge(60000)=1100;
 ASSERT public.withdrawal_service_charge(60001)=1700;
 ASSERT public.withdrawal_service_charge(100000)=1700;
 ASSERT public.withdrawal_service_charge(500000)=1700;
 ASSERT public.withdrawal_service_charge(500001)=2500;
 ASSERT public.withdrawal_service_charge(1000000)=2500;
 ASSERT public.withdrawal_service_charge(1000001)=2900;
END $$;