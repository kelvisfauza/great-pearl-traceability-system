-- Retried after verifying no receipt table was created.
CREATE TABLE public.gosentepay_payout_receipts(reference text PRIMARY KEY,amount numeric NOT NULL,provider_fee numeric NOT NULL,status text NOT NULL DEFAULT 'prepared',accounting_error text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),accounted_at timestamptz);
GRANT ALL ON public.gosentepay_payout_receipts TO service_role;
ALTER TABLE public.gosentepay_payout_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System workers manage payout receipts" ON public.gosentepay_payout_receipts FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE TRIGGER payout_receipts_updated_at BEFORE UPDATE ON public.gosentepay_payout_receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.prepare_gosentepay_payout(p_reference text,p_amount numeric) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_claim text;
BEGIN
 IF p_reference IS NULL OR length(p_reference)=0 OR length(p_reference)>30 OR p_amount IS NULL OR p_amount<=0 OR p_amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Invalid payout receipt'; END IF;
 INSERT INTO public.gosentepay_payout_receipts(reference,amount,provider_fee) VALUES(p_reference,p_amount,CASE WHEN p_amount>60000 THEN 2200 ELSE 1600 END) ON CONFLICT(reference) DO NOTHING RETURNING reference INTO v_claim;
 RETURN v_claim IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.prepare_gosentepay_payout(text,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_gosentepay_payout(text,numeric) TO service_role;
CREATE OR REPLACE FUNCTION public.mark_gosentepay_payout_outcome(p_reference text,p_accepted boolean) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF p_accepted IS NULL THEN RAISE EXCEPTION 'Explicit provider outcome required'; END IF;
 UPDATE public.gosentepay_payout_receipts SET status=CASE WHEN p_accepted THEN 'accepted' ELSE 'rejected' END WHERE reference=p_reference AND status='prepared';
 RETURN EXISTS(SELECT 1 FROM public.gosentepay_payout_receipts WHERE reference=p_reference AND status IN (CASE WHEN p_accepted THEN 'accepted' ELSE 'rejected' END,CASE WHEN p_accepted THEN 'accounted' ELSE 'rejected' END));
END $$;
REVOKE ALL ON FUNCTION public.mark_gosentepay_payout_outcome(text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mark_gosentepay_payout_outcome(text,boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.gosentepay_balance_adjust(p_delta numeric,p_type text,p_reference text,p_notes text,p_by text DEFAULT 'system') RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_row public.gosentepay_balance%ROWTYPE; v_new numeric;
BEGIN
 SELECT * INTO v_row FROM public.gosentepay_balance ORDER BY updated_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'GosentePay balance record is unavailable'; END IF;
 IF p_reference IS NOT NULL AND EXISTS(SELECT 1 FROM public.gosentepay_balance_log WHERE reference=p_reference AND change_type=p_type) THEN RETURN NULL; END IF;
 v_new:=v_row.balance+p_delta;
 UPDATE public.gosentepay_balance SET balance=v_new,last_transaction_ref=p_reference,last_transaction_type=p_type,last_updated_by=p_by,updated_at=now() WHERE id=v_row.id;
 INSERT INTO public.gosentepay_balance_log(previous_balance,new_balance,change_amount,change_type,reference,notes,created_by) VALUES(v_row.balance,v_new,p_delta,p_type,p_reference,p_notes,p_by);
 RETURN v_new;
END $$;
CREATE OR REPLACE FUNCTION public.treasury_post_gosente_fee() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_gross numeric; v_fee numeric; v_ref text;
BEGIN
 IF NEW.change_type='payout_deduction' THEN
  v_gross:=-NEW.change_amount; IF v_gross<=0 THEN RETURN NEW; END IF;
  v_fee:=CASE WHEN v_gross-2200>60000 THEN 2200 ELSE 1600 END; v_ref:='GSFEE-'||NEW.reference;
  IF EXISTS(SELECT 1 FROM treasury_account_entries WHERE reference=v_ref AND direction='debit') THEN RETURN NEW; END IF;
  PERFORM public.treasury_account_post('operations','debit',v_fee,'external',v_ref,NULL,NULL,NULL,'GosentePay service charge on payout '||NEW.reference,'system',jsonb_build_object('kind','provider_fee','provider','gosentepay','payout_reference',NEW.reference));
 ELSIF NEW.change_type='payout_reversal' THEN
  v_ref:='GSFEE-'||NEW.reference;
  SELECT amount INTO v_fee FROM treasury_account_entries WHERE reference=v_ref AND direction='debit' LIMIT 1;
  IF v_fee IS NULL OR EXISTS(SELECT 1 FROM treasury_account_entries WHERE reference=v_ref AND direction='credit') THEN RETURN NEW; END IF;
  PERFORM public.treasury_account_post('operations','credit',v_fee,'external',v_ref,NULL,NULL,NULL,'GosentePay service charge returned (payout bounced) '||NEW.reference,'system',jsonb_build_object('kind','provider_fee_reversal','provider','gosentepay'));
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.treasury_post_gosente_fee() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.settle_gosentepay_payout(p_reference text) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_receipt public.gosentepay_payout_receipts%ROWTYPE; v_delta numeric;
BEGIN
 SELECT * INTO v_receipt FROM public.gosentepay_payout_receipts WHERE reference=p_reference FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Payout receipt is unavailable'; END IF;
 IF v_receipt.status='accounted' THEN RETURN true; END IF;
 IF v_receipt.status<>'accepted' THEN RAISE EXCEPTION 'Provider acceptance is not confirmed'; END IF;
 SELECT change_amount INTO v_delta FROM public.gosentepay_balance_log WHERE reference=p_reference AND change_type='payout_deduction' LIMIT 1;
 IF v_delta IS NOT NULL AND v_delta<>-(v_receipt.amount+v_receipt.provider_fee) THEN RAISE EXCEPTION 'Existing payout deduction does not match receipt'; END IF;
 PERFORM public.gosentepay_balance_adjust(-(v_receipt.amount+v_receipt.provider_fee),'payout_deduction',p_reference,'Accepted payout and provider fee recorded from durable receipt','system');
 UPDATE public.gosentepay_payout_receipts SET status='accounted',accounted_at=now(),accounting_error=NULL WHERE reference=p_reference;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.settle_gosentepay_payout(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.settle_gosentepay_payout(text) TO service_role;
CREATE OR REPLACE FUNCTION public.recover_gosentepay_payout_accounting() RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE r record; v_recovered integer:=0; v_failed integer:=0;
BEGIN
 FOR r IN SELECT reference FROM public.gosentepay_payout_receipts WHERE status='accepted' ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED LOOP
  BEGIN
   PERFORM public.settle_gosentepay_payout(r.reference); v_recovered:=v_recovered+1;
  EXCEPTION WHEN OTHERS THEN
   UPDATE public.gosentepay_payout_receipts SET accounting_error=SQLERRM WHERE reference=r.reference; v_failed:=v_failed+1;
  END;
 END LOOP;
 RETURN jsonb_build_object('recovered',v_recovered,'failed',v_failed);
END $$;
REVOKE ALL ON FUNCTION public.recover_gosentepay_payout_accounting() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.recover_gosentepay_payout_accounting() TO service_role;
CREATE OR REPLACE FUNCTION public.treasury_reconciliation_snapshot() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT jsonb_build_object('expected',(SELECT sum(balance) FROM treasury_accounts WHERE is_active AND kind<>'holding'),'bank',(SELECT sum(balance) FROM treasury_accounts WHERE is_active AND kind='holding'),'yo',(SELECT last_yo_synced_balance FROM treasury_pool_balance WHERE id=1),'yo_synced_at',(SELECT last_yo_synced_at FROM treasury_pool_balance WHERE id=1),'gosente',(SELECT balance FROM gosentepay_balance ORDER BY updated_at DESC LIMIT 1),'pending_accounting',(SELECT count(*) FROM gosentepay_payout_receipts WHERE status='accepted'),'uncertain_payouts',(SELECT count(*) FROM gosentepay_payout_receipts WHERE status='prepared' AND created_at<now()-interval '10 minutes'));
$$;
REVOKE ALL ON FUNCTION public.treasury_reconciliation_snapshot() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.treasury_reconciliation_snapshot() TO service_role;
NOTIFY pgrst,'reload schema';