-- Update the execute_approved_deletion function to handle cascading deletions
CREATE OR REPLACE FUNCTION public.execute_approved_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only execute if status changed to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- Handle cascading deletions for specific tables
    IF NEW.table_name = 'coffee_records' THEN
      -- Delete associated quality assessments first
      DELETE FROM public.quality_assessments 
      WHERE store_record_id = NEW.record_id;
      
      -- Delete associated payment records
      DELETE FROM public.payment_records 
      WHERE batch_number IN (
        SELECT batch_number FROM public.coffee_records 
        WHERE id = NEW.record_id
      );
      
      -- Log the cascading deletions in audit_logs
      INSERT INTO public.audit_logs (
        action, 
        table_name, 
        record_id, 
        reason, 
        performed_by,
        department,
        record_data
      ) VALUES (
        'cascade_delete',
        'quality_assessments',
        NEW.record_id,
        'Cascaded deletion due to coffee record deletion',
        COALESCE(NEW.reviewed_by, 'System'),
        'Admin',
        jsonb_build_object('parent_table', 'coffee_records', 'parent_id', NEW.record_id)
      );
    END IF;
    
    IF NEW.table_name = 'suppliers' THEN
      -- Delete associated supplier contracts first
      DELETE FROM public.supplier_contracts 
      WHERE supplier_id::text = NEW.record_id;
      
      -- Delete associated contract approvals
      DELETE FROM public.contract_approvals 
      WHERE contract_id IN (
        SELECT id FROM public.supplier_contracts 
        WHERE supplier_id::text = NEW.record_id
      );
    END IF;
    
    -- Execute the main deletion based on table_name
    -- Handle both UUID and TEXT record IDs
    IF NEW.table_name IN ('coffee_records', 'quality_assessments', 'payment_records', 'suppliers', 'employees') THEN
      EXECUTE format('DELETE FROM public.%I WHERE id = $1', NEW.table_name) 
      USING NEW.record_id;
    ELSE
      -- For other tables, try UUID first, then text
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE id = $1', NEW.table_name) 
        USING NEW.record_id::uuid;
      EXCEPTION WHEN invalid_text_representation THEN
        EXECUTE format('DELETE FROM public.%I WHERE id = $1', NEW.table_name) 
        USING NEW.record_id;
      END;
    END IF;
    
    -- Log the main deletion in audit_logs
    INSERT INTO public.audit_logs (
      action, 
      table_name, 
      record_id, 
      reason, 
      performed_by,
      department,
      record_data
    ) VALUES (
      'admin_approved_delete',
      NEW.table_name,
      NEW.record_id,
      NEW.reason,
      COALESCE(NEW.reviewed_by, 'System'),
      'Admin',
      NEW.record_data
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;