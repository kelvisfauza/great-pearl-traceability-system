ALTER TABLE public.coffee_records ADD COLUMN sample_taken boolean, ADD COLUMN sampling_order_id uuid REFERENCES public.quality_sampling_orders(id) ON DELETE RESTRICT;
CREATE INDEX coffee_records_sampling_order_idx ON public.coffee_records(sampling_order_id) WHERE sampling_order_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.validate_delivery_sampling() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_order public.quality_sampling_orders%ROWTYPE;
BEGIN
 IF TG_OP = 'UPDATE' AND NEW.sample_taken IS NOT DISTINCT FROM OLD.sample_taken AND NEW.sampling_order_id IS NOT DISTINCT FROM OLD.sampling_order_id AND NEW.supplier_name IS NOT DISTINCT FROM OLD.supplier_name AND NEW.batch_number IS NOT DISTINCT FROM OLD.batch_number THEN RETURN NEW; END IF;
 IF NEW.sample_taken IS TRUE AND NEW.sampling_order_id IS NULL THEN RAISE EXCEPTION 'Attach a sampling order when a sample was taken'; END IF;
 IF NEW.sampling_order_id IS NOT NULL THEN
  IF NEW.sample_taken IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'A sampling order requires sample taken to be Yes'; END IF;
  SELECT * INTO v_order FROM public.quality_sampling_orders WHERE id=NEW.sampling_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sampling order is unavailable'; END IF;
  IF lower(btrim(v_order.supplier_name)) <> lower(btrim(NEW.supplier_name)) THEN RAISE EXCEPTION 'Sampling order must belong to the selected supplier'; END IF;
  IF v_order.linked_store_record_id IS NOT NULL AND v_order.linked_store_record_id <> NEW.id THEN RAISE EXCEPTION 'Sampling order is already attached to another delivery'; END IF;
  IF v_order.linked_store_record_id IS NULL AND v_order.linked_batch_number IS NOT NULL AND v_order.linked_batch_number <> NEW.batch_number THEN RAISE EXCEPTION 'Sampling order is already attached to another batch'; END IF;
  IF EXISTS (SELECT 1 FROM public.coffee_records WHERE sampling_order_id=NEW.sampling_order_id AND id<>NEW.id) THEN RAISE EXCEPTION 'Sampling order is already attached to another delivery'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.link_delivery_sampling() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.sampling_order_id IS NOT NULL AND OLD.sampling_order_id IS DISTINCT FROM NEW.sampling_order_id THEN
   UPDATE public.quality_sampling_orders SET linked_store_record_id=NULL,linked_batch_number=NULL,linked_at=NULL WHERE id=OLD.sampling_order_id AND linked_store_record_id=OLD.id;
  END IF;
 END IF;
 IF NEW.sampling_order_id IS NOT NULL THEN
  UPDATE public.quality_sampling_orders SET linked_store_record_id=NEW.id,linked_batch_number=NEW.batch_number,linked_at=COALESCE(linked_at,now()) WHERE id=NEW.sampling_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unable to attach sampling order'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_delivery_sampling() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_delivery_sampling() FROM PUBLIC;
CREATE TRIGGER validate_delivery_sampling BEFORE INSERT OR UPDATE ON public.coffee_records FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_sampling();
CREATE TRIGGER link_delivery_sampling AFTER INSERT OR UPDATE OF sampling_order_id,batch_number ON public.coffee_records FOR EACH ROW EXECUTE FUNCTION public.link_delivery_sampling();