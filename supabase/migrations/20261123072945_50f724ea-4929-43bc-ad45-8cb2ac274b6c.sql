-- Execute through the migration tool; all receipt/balance/fee writes roll back.
DO $tests$
DECLARE v_before numeric; v_after numeric; v_operations numeric; v_logs integer; v_ref text:='TEST-ACCOUNTING-'||substr(gen_random_uuid()::text,1,8);
BEGIN
 IF has_table_privilege('authenticated','public.gosentepay_payout_receipts','SELECT') OR has_function_privilege('authenticated','public.settle_gosentepay_payout(text)','EXECUTE') THEN
  RAISE EXCEPTION 'Payout accounting must remain system-only';
 END IF;
 BEGIN
  SELECT balance INTO v_before FROM public.gosentepay_balance ORDER BY updated_at DESC LIMIT 1;
  SELECT balance INTO v_operations FROM public.treasury_accounts WHERE code='operations';
  IF public.prepare_gosentepay_payout(v_ref,65000) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Receipt not claimed'; END IF;
  IF public.prepare_gosentepay_payout(v_ref,65000) IS DISTINCT FROM false THEN RAISE EXCEPTION 'Duplicate payout not blocked'; END IF;
  BEGIN
   PERFORM public.settle_gosentepay_payout(v_ref);
   RAISE EXCEPTION 'Unconfirmed payout was settled';
  EXCEPTION WHEN OTHERS THEN
   IF SQLERRM<>'Provider acceptance is not confirmed' THEN RAISE; END IF;
  END;
  PERFORM public.mark_gosentepay_payout_outcome(v_ref,true);
  PERFORM public.settle_gosentepay_payout(v_ref);
  PERFORM public.settle_gosentepay_payout(v_ref);
  SELECT balance INTO v_after FROM public.gosentepay_balance ORDER BY updated_at DESC LIMIT 1;
  IF v_before-v_after<>67200 THEN RAISE EXCEPTION '65,000 payout must deduct exactly 67,200 including fee'; END IF;
  IF (SELECT balance FROM public.treasury_accounts WHERE code='operations')<>v_operations-2200 THEN RAISE EXCEPTION 'Provider cost must debit Operations exactly 2,200'; END IF;
  SELECT count(*) INTO v_logs FROM public.gosentepay_balance_log WHERE reference=v_ref AND change_type='payout_deduction';
  IF v_logs<>1 THEN RAISE EXCEPTION 'Retry created duplicate balance deductions'; END IF;
  RAISE EXCEPTION 'rollback_payout_accounting_test';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM<>'rollback_payout_accounting_test' THEN RAISE; END IF;
 END;
 IF EXISTS(SELECT 1 FROM public.gosentepay_payout_receipts WHERE reference=v_ref) THEN RAISE EXCEPTION 'Test receipt did not roll back'; END IF;
END
$tests$;