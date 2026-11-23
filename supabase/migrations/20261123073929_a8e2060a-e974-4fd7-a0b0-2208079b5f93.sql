DO $$
DECLARE
 v_op public.admin_wallet_operations%ROWTYPE;
 v_ledger public.ledger_entries%ROWTYPE;
 v_entry record;
 v_total numeric;
 v_before numeric;
BEGIN
 SELECT * INTO v_op FROM public.admin_wallet_operations WHERE id='6937c1e0-faaa-493e-9c54-2196204f279b' FOR UPDATE;
 IF NOT FOUND OR v_op.amount<>280000 OR v_op.status<>'completed' OR v_op.operation_type<>'debit' THEN RAISE EXCEPTION 'Benson operation changed; correction stopped'; END IF;
 SELECT * INTO v_ledger FROM public.ledger_entries WHERE id='df7985ff-5d5d-411b-9621-9778ba4d7452' FOR UPDATE;
 IF NOT FOUND OR v_ledger.reference IS DISTINCT FROM v_op.ledger_reference OR v_ledger.amount<>-280000 THEN RAISE EXCEPTION 'Original debit changed; correction stopped'; END IF;
 IF EXISTS(SELECT 1 FROM public.treasury_account_entries WHERE reference='CORRECT-INTERNAL-'||v_op.id::text) THEN RETURN; END IF;
 PERFORM 1 FROM public.treasury_account_entries WHERE ledger_entry_id=v_ledger.id FOR UPDATE;
 SELECT sum(amount) INTO v_total FROM public.treasury_account_entries WHERE ledger_entry_id=v_ledger.id AND direction='debit' AND account_code IN ('user_wallets','loans_overdrafts') AND counter_account='external';
 IF v_total IS DISTINCT FROM 280000::numeric OR EXISTS(SELECT 1 FROM public.treasury_account_entries WHERE ledger_entry_id=v_ledger.id AND direction='credit') THEN RAISE EXCEPTION 'Unexpected treasury movements; correction stopped'; END IF;
 SELECT sum(balance) INTO v_before FROM public.treasury_accounts WHERE is_active AND kind<>'holding';
 INSERT INTO public.audit_logs(action,table_name,record_id,performed_by,reason,record_data)
 VALUES('correct_internal_admin_debit','admin_wallet_operations',v_op.id::text,'Fauza Kelvis (chat confirmation)','Confirmed UGX 280,000 is an internal debit to General; supersedes previous separate-office-cash classification. No external payout, wallet refund or fee reversal.',jsonb_build_object('previous_operation',to_jsonb(v_op),'previous_ledger',to_jsonb(v_ledger),'previous_movements',(SELECT jsonb_agg(to_jsonb(e)) FROM public.treasury_account_entries e WHERE ledger_entry_id=v_ledger.id),'previous_pool_entries',(SELECT jsonb_agg(to_jsonb(e)) FROM public.treasury_pool_entries e WHERE reference=v_op.ledger_reference)));
 FOR v_entry IN SELECT * FROM public.treasury_account_entries WHERE ledger_entry_id=v_ledger.id AND direction='debit' AND account_code IN ('user_wallets','loans_overdrafts') AND counter_account='external' LOOP
  PERFORM public.treasury_account_post('general','credit',v_entry.amount,v_entry.account_code,'CORRECT-INTERNAL-'||v_op.id::text,v_ledger.id,v_op.target_email,v_op.target_name,'Internal admin debit returned to General — Benson UGX 280,000','Fauza Kelvis',jsonb_build_object('correction','internal_admin_debit','original_entry_id',v_entry.id,'operation_id',v_op.id,'no_external_payment',true));
 END LOOP;
 UPDATE public.treasury_account_entries SET counter_account='general',metadata=metadata||jsonb_build_object('classification_corrected','internal_admin_debit','confirmed_by','Fauza Kelvis') WHERE ledger_entry_id=v_ledger.id AND direction='debit' AND counter_account='external';
 UPDATE public.admin_wallet_operations SET payout_provider=NULL,metadata=(COALESCE(metadata,'{}'::jsonb)-'cash_source_confirmed'-'cash_confirmation_at'-'cash_confirmed_by')||jsonb_build_object('movement_type','internal_admin_debit','destination_account','general','confirmed_by','Fauza Kelvis','classification_corrected_at',now()) WHERE id=v_op.id;
 UPDATE public.ledger_entries SET source_category='ADMIN_ADJUSTMENT',metadata=(COALESCE(metadata,'{}'::jsonb)-'provider'-'cash_source'-'type')||jsonb_build_object('type','internal_admin_debit','destination_account','general','classification_corrected_at',now()) WHERE id=v_ledger.id;
 UPDATE public.treasury_pool_entries SET channel='internal',category='adjustment',description='Internal debit to General Account — not an external payout',metadata=(COALESCE(metadata,'{}'::jsonb)-'cash_source'-'cash_confirmed_by')||jsonb_build_object('source','ADMIN_ADJUSTMENT','meta_type','internal_admin_debit','destination_account','general','classification_corrected_at',now()) WHERE reference=v_op.ledger_reference AND amount=280000;
 IF (SELECT sum(balance) FROM public.treasury_accounts WHERE is_active AND kind<>'holding') IS DISTINCT FROM v_before+280000 THEN RAISE EXCEPTION 'General correction amount mismatch'; END IF;
 IF (SELECT amount FROM public.ledger_entries WHERE id=v_ledger.id)<>-280000 THEN RAISE EXCEPTION 'Wallet debit changed'; END IF;
END $$;
SELECT 1 / CASE WHEN public.treasury_resolve_account('ADMIN_ADJUSTMENT','','WITHDRAWAL',-280000)='general' THEN 1 ELSE 0 END AS internal_debit_returns_to_general;
SELECT 1 / CASE WHEN public.treasury_resolve_account('INSTANT_WITHDRAWAL','','WITHDRAWAL',-65000) IS NULL THEN 1 ELSE 0 END AS phone_withdrawal_leaves_system;