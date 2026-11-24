REVOKE EXECUTE ON FUNCTION public.bulk_deduct_unprocessed_sales(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.backfill_treasury_from_ledger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.backfill_missing_inventory_batch_sources() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.backfill_discretion_finance_lots() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_overdraft_recovery(uuid,numeric,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._qr_lookup_employee(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.allocate_milling_remittance(text,text,numeric,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_deduct_unprocessed_sales(text), public.backfill_treasury_from_ledger(), public.backfill_missing_inventory_batch_sources(), public.backfill_discretion_finance_lots(), public.apply_overdraft_recovery(uuid,numeric,uuid,text), public._qr_lookup_employee(text), public.allocate_milling_remittance(text,text,numeric,text,text,text) TO service_role;
DO $$
DECLARE target regprocedure;
BEGIN
 FOREACH target IN ARRAY ARRAY['public.bulk_deduct_unprocessed_sales(text)'::regprocedure,'public.backfill_treasury_from_ledger()'::regprocedure,'public.backfill_missing_inventory_batch_sources()'::regprocedure,'public.backfill_discretion_finance_lots()'::regprocedure,'public.apply_overdraft_recovery(uuid,numeric,uuid,text)'::regprocedure,'public._qr_lookup_employee(text)'::regprocedure,'public.allocate_milling_remittance(text,text,numeric,text,text,text)'::regprocedure] LOOP
  IF has_function_privilege('authenticated',target,'EXECUTE') OR has_function_privilege('anon',target,'EXECUTE') THEN RAISE EXCEPTION 'Client access remains on %',target; END IF;
  IF NOT has_function_privilege('service_role',target,'EXECUTE') THEN RAISE EXCEPTION 'Server access missing on %',target; END IF;
 END LOOP;
END $$;