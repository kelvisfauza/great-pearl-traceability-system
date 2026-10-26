CREATE OR REPLACE FUNCTION public.restore_sale_inventory(p_sale_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r record;
BEGIN
  PERFORM 1 FROM public.inventory_batches WHERE id IN (SELECT batch_id FROM public.inventory_batch_sales WHERE sale_transaction_id=p_sale_id) ORDER BY id FOR UPDATE;
  FOR r IN SELECT batch_id,sum(kilograms_deducted) kg FROM public.inventory_batch_sales WHERE sale_transaction_id=p_sale_id GROUP BY batch_id LOOP
    UPDATE public.inventory_batches SET remaining_kilograms=remaining_kilograms+r.kg,status=CASE WHEN remaining_kilograms+r.kg<=0 THEN 'sold_out' ELSE 'selling' END,sold_out_at=CASE WHEN remaining_kilograms+r.kg<=0 THEN sold_out_at ELSE NULL END WHERE id=r.batch_id;
    INSERT INTO public.inventory_movements(coffee_record_id,movement_type,quantity_kg,reference_type,reference_id,created_by,notes) VALUES(r.batch_id::text,'SALE_REVERSAL',r.kg,'sale_reversal',p_sale_id::text,coalesce(public.current_user_email(),'System correction'),'Restore recorded sale allocation');
  END LOOP;
  DELETE FROM public.inventory_batch_sales WHERE sale_transaction_id=p_sale_id;
  DELETE FROM public.sales_inventory_tracking WHERE sale_id=p_sale_id::text;
END $$;
REVOKE ALL ON FUNCTION public.restore_sale_inventory(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.deduct_from_inventory_batches(p_coffee_type text,p_quantity_kg numeric,p_sale_id uuid DEFAULT NULL,p_customer text DEFAULT NULL) RETURNS TABLE(batch_id uuid,batch_code text,deducted_kg numeric) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE remaining_to_deduct numeric; b record; amount numeric; sale_row public.sales_transactions%ROWTYPE;
BEGIN
  IF p_sale_id IS NULL THEN RAISE EXCEPTION 'A saved sale is required for inventory deductions'; END IF;
  SELECT * INTO sale_row FROM public.sales_transactions WHERE id=p_sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF lower(sale_row.status) <> 'completed' THEN RETURN; END IF;
  IF lower(trim(sale_row.coffee_type)) IS DISTINCT FROM lower(trim(p_coffee_type)) THEN RAISE EXCEPTION 'Coffee type does not match sale'; END IF;
  remaining_to_deduct := LEAST(p_quantity_kg,sale_row.weight-COALESCE((SELECT sum(kilograms_deducted) FROM public.inventory_batch_sales WHERE sale_transaction_id=p_sale_id),0));
  IF remaining_to_deduct<=0 THEN RETURN; END IF;
  FOR b IN SELECT ib.* FROM public.inventory_batches ib WHERE lower(trim(ib.coffee_type))=lower(trim(p_coffee_type)) AND ib.remaining_kilograms>0 AND ib.status IN ('active','filling','selling') ORDER BY ib.batch_date,ib.batch_code,ib.id FOR UPDATE LOOP
    EXIT WHEN remaining_to_deduct<=0;
    amount:=least(b.remaining_kilograms,remaining_to_deduct);
    UPDATE public.inventory_batches SET remaining_kilograms=remaining_kilograms-amount,status=CASE WHEN remaining_kilograms-amount<=0 THEN 'sold_out' ELSE 'selling' END,sold_out_at=CASE WHEN remaining_kilograms-amount<=0 THEN now() ELSE NULL END WHERE id=b.id;
    INSERT INTO public.inventory_movements(coffee_record_id,movement_type,quantity_kg,reference_type,reference_id,created_by,notes) VALUES(b.id::text,'SALE',-amount,'sale',p_sale_id::text,coalesce(public.current_user_email(),'Sales Department'),'Sale to '||coalesce(p_customer,'customer')||' from batch '||b.batch_code);
    UPDATE public.inventory_batch_sales SET kilograms_deducted=kilograms_deducted+amount,customer_name=sale_row.customer,sale_date=sale_row.date WHERE inventory_batch_sales.batch_id=b.id AND sale_transaction_id=p_sale_id;
    IF NOT FOUND THEN INSERT INTO public.inventory_batch_sales(batch_id,sale_transaction_id,kilograms_deducted,customer_name,sale_date) VALUES(b.id,p_sale_id,amount,sale_row.customer,sale_row.date); END IF;
    remaining_to_deduct:=remaining_to_deduct-amount;
    batch_id:=b.id; batch_code:=b.batch_code; deducted_kg:=amount; RETURN NEXT;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.auto_deduct_inventory_on_sale() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF lower(NEW.status)='completed' THEN PERFORM public.deduct_from_inventory_batches(NEW.coffee_type,NEW.weight,NEW.id,NEW.customer); END IF;
  ELSE
    IF lower(OLD.status)='completed' AND (lower(NEW.status) IS DISTINCT FROM 'completed' OR NEW.weight IS DISTINCT FROM OLD.weight OR NEW.coffee_type IS DISTINCT FROM OLD.coffee_type) THEN
      INSERT INTO public.audit_logs(action,table_name,record_id,record_data,reason,performed_by,department) VALUES('sale_stock_reversal','sales_transactions',OLD.id::text,jsonb_build_object('sale',to_jsonb(OLD),'allocations',(SELECT jsonb_agg(to_jsonb(s)) FROM public.inventory_batch_sales s WHERE sale_transaction_id=OLD.id)),'Sale cancelled or stock fields changed',coalesce(public.current_user_email(),'System'),'Sales');
      PERFORM public.restore_sale_inventory(OLD.id);
      DELETE FROM public.eudr_batch_sales WHERE sale_transaction_id=OLD.id;
      DELETE FROM public.contract_allocations WHERE sale_id=OLD.id;
    END IF;
    IF lower(NEW.status)='completed' AND (lower(OLD.status) IS DISTINCT FROM 'completed' OR NEW.weight IS DISTINCT FROM OLD.weight OR NEW.coffee_type IS DISTINCT FROM OLD.coffee_type) THEN PERFORM public.deduct_from_inventory_batches(NEW.coffee_type,NEW.weight,NEW.id,NEW.customer); END IF;
    UPDATE public.inventory_batch_sales SET customer_name=NEW.customer,sale_date=NEW.date WHERE sale_transaction_id=NEW.id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.restore_inventory_before_sale_delete() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  INSERT INTO public.audit_logs(action,table_name,record_id,record_data,reason,performed_by,department) VALUES('delete','sales_transactions',OLD.id::text,jsonb_build_object('sale',to_jsonb(OLD),'allocations',(SELECT jsonb_agg(to_jsonb(s)) FROM public.inventory_batch_sales s WHERE sale_transaction_id=OLD.id),'tracking',(SELECT jsonb_agg(to_jsonb(s)) FROM public.sales_inventory_tracking s WHERE sale_id=OLD.id::text),'contracts',(SELECT jsonb_agg(to_jsonb(s)) FROM public.contract_allocations s WHERE sale_id=OLD.id),'eudr',(SELECT jsonb_agg(to_jsonb(s)) FROM public.eudr_batch_sales s WHERE sale_transaction_id=OLD.id)),coalesce(nullif(current_setting('app.sale_delete_reason',true),''),'Sale deleted; recorded stock allocations restored'),coalesce(public.current_user_email(),'System correction'),'Sales');
  PERFORM public.restore_sale_inventory(OLD.id);
  RETURN OLD;
END $$;
CREATE TRIGGER restore_inventory_before_sale_delete BEFORE DELETE ON public.sales_transactions FOR EACH ROW EXECUTE FUNCTION public.restore_inventory_before_sale_delete();
REVOKE ALL ON FUNCTION public.restore_inventory_before_sale_delete() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.bulk_deduct_unprocessed_sales(p_coffee_type text DEFAULT NULL) RETURNS TABLE(sales_processed integer,total_deducted numeric,sales_short integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s record; d record; n integer:=0; kg numeric:=0; short integer:=0; actual numeric;
BEGIN
 FOR s IN SELECT st.*,st.weight-coalesce((SELECT sum(kilograms_deducted) FROM public.inventory_batch_sales WHERE sale_transaction_id=st.id),0) remaining FROM public.sales_transactions st WHERE lower(st.status)='completed' AND (p_coffee_type IS NULL OR lower(st.coffee_type)=lower(p_coffee_type)) ORDER BY st.date,st.created_at LOOP
  IF s.remaining<=0 THEN CONTINUE; END IF;
  actual:=0;
  FOR d IN SELECT * FROM public.deduct_from_inventory_batches(s.coffee_type,s.remaining,s.id,s.customer) LOOP actual:=actual+d.deducted_kg; END LOOP;
  n:=n+1; kg:=kg+actual; IF actual<s.remaining THEN short:=short+1; END IF;
 END LOOP;
 sales_processed:=n;total_deducted:=kg;sales_short:=short;RETURN NEXT;
END $$;