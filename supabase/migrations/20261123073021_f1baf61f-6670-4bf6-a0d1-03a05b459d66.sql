DO $$
DECLARE v_op public.admin_wallet_operations%ROWTYPE;
BEGIN
 SELECT * INTO v_op FROM public.admin_wallet_operations WHERE id='6937c1e0-faaa-493e-9c54-2196204f279b' FOR UPDATE;
 IF NOT FOUND OR v_op.amount<>280000 OR v_op.status<>'completed' OR v_op.operation_type<>'debit' THEN RAISE EXCEPTION 'Benson operation changed; correction stopped'; END IF;
 IF NOT COALESCE(v_op.metadata,'{}'::jsonb) ? 'cash_source_confirmed' THEN
 INSERT INTO public.audit_logs(action,table_name,record_id,performed_by,reason,record_data)
 VALUES('confirm_cash_payment_channel','admin_wallet_operations',v_op.id::text,'Fauza Kelvis (chat confirmation)','UGX 280,000 was paid from separate office cash, not Cash at Bank; labels only, balances preserved',jsonb_build_object('previous_operation',to_jsonb(v_op),'amount',280000,'cash_source','separate_office_cash','balances_changed',false));
 UPDATE public.admin_wallet_operations SET payout_provider='cash',metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('cash_source_confirmed','separate_office_cash','cash_confirmation_at',now(),'cash_confirmed_by','Fauza Kelvis') WHERE id=v_op.id;
 UPDATE public.ledger_entries SET metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('provider','cash','type','cash_payout','cash_source','separate_office_cash') WHERE id='df7985ff-5d5d-411b-9621-9778ba4d7452' AND reference=v_op.ledger_reference AND amount=-280000;
 UPDATE public.treasury_pool_entries SET channel='cash',metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('cash_source','separate_office_cash','cash_confirmed_by','Fauza Kelvis') WHERE reference=v_op.ledger_reference AND amount=280000;
 END IF;
END $$;
SELECT net.http_post(url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/treasury-monitor',headers:=private_edge.header()||'{"Content-Type":"application/json"}'::jsonb,body:='{}'::jsonb,timeout_milliseconds:=120000);