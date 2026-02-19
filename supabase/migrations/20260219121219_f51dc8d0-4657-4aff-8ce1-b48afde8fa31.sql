
-- Trigger: Log RECEIPT when a new coffee_record is created (status = 'pending')
CREATE OR REPLACE FUNCTION public.log_inventory_movement_on_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log when a new coffee record is inserted (receipt at store)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.inventory_movements (
      movement_type, coffee_record_id, quantity_kg,
      reference_type, reference_id, notes, created_by
    ) VALUES (
      'RECEIPT',
      NEW.id::text,
      NEW.kilograms,
      'coffee_record',
      NEW.id::text,
      'Received ' || NEW.kilograms || 'kg of ' || NEW.coffee_type || ' from ' || NEW.supplier_name || ' (Batch: ' || NEW.batch_number || ')',
      COALESCE(NEW.created_by, 'Store Department')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_receipt_on_coffee_record
  AFTER INSERT ON public.coffee_records
  FOR EACH ROW
  EXECUTE FUNCTION public.log_inventory_movement_on_receipt();

-- Trigger: Log TRANSFER when coffee_record status changes to 'inventory' (approved from quality)
CREATE OR REPLACE FUNCTION public.log_inventory_movement_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log when coffee moves to inventory (quality approved)
  IF NEW.status = 'inventory' AND OLD.status != 'inventory' THEN
    INSERT INTO public.inventory_movements (
      movement_type, coffee_record_id, quantity_kg,
      reference_type, reference_id, notes, created_by
    ) VALUES (
      'TRANSFER',
      NEW.id::text,
      NEW.kilograms,
      'coffee_record',
      NEW.id::text,
      'Transferred to inventory after quality approval - ' || NEW.kilograms || 'kg ' || NEW.coffee_type || ' (Batch: ' || NEW.batch_number || ')',
      'Quality Department'
    );
  END IF;

  -- Log when coffee is rejected
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO public.inventory_movements (
      movement_type, coffee_record_id, quantity_kg,
      reference_type, reference_id, notes, created_by
    ) VALUES (
      'ADJUSTMENT',
      NEW.id::text,
      -NEW.kilograms,
      'coffee_record',
      NEW.id::text,
      'Rejected during quality assessment - ' || NEW.kilograms || 'kg ' || NEW.coffee_type || ' (Batch: ' || NEW.batch_number || ')',
      'Quality Department'
    );
  END IF;

  -- Log manual kg adjustments on existing records
  IF OLD.status = NEW.status AND OLD.kilograms != NEW.kilograms THEN
    INSERT INTO public.inventory_movements (
      movement_type, coffee_record_id, quantity_kg,
      reference_type, reference_id, notes, created_by
    ) VALUES (
      'ADJUSTMENT',
      NEW.id::text,
      NEW.kilograms - OLD.kilograms,
      'coffee_record',
      NEW.id::text,
      'Stock adjustment: ' || OLD.kilograms || 'kg → ' || NEW.kilograms || 'kg (Batch: ' || NEW.batch_number || ')',
      COALESCE(NEW.created_by, 'System')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_movement_on_status_change
  AFTER UPDATE ON public.coffee_records
  FOR EACH ROW
  EXECUTE FUNCTION public.log_inventory_movement_on_status_change();
