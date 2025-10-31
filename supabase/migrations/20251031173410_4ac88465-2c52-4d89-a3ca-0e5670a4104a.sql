-- Drop the existing trigger
DROP TRIGGER IF EXISTS execute_approved_deletion_trigger ON deletion_requests;

-- Recreate the function with proper cascading deletion order
CREATE OR REPLACE FUNCTION public.execute_approved_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_paid_payment BOOLEAN := false;
BEGIN
  -- Only execute if status changed to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- Special handling for coffee_records - check payment status first
    IF NEW.table_name = 'coffee_records' THEN
      -- Check if any associated payment records are paid
      SELECT EXISTS (
        SELECT 1 FROM public.payment_records 
        WHERE batch_number IN (
          SELECT batch_number FROM public.coffee_records 
          WHERE id = NEW.record_id::uuid
        )
        AND status IN ('Paid', 'paid', 'completed', 'Completed')
      ) INTO has_paid_payment;
      
      -- If payment has been made, prevent deletion
      IF has_paid_payment THEN
        -- Update deletion request status to rejected with reason
        UPDATE public.deletion_requests
        SET 
          status = 'rejected',
          admin_comments = 'Cannot delete: Payment has already been made for this record',
          reviewed_at = now(),
          reviewed_by = COALESCE(NEW.reviewed_by, 'System')
        WHERE id = NEW.id;
        
        RETURN NEW;
      END IF;
      
      -- Delete in correct order to avoid foreign key violations
      -- 1. Delete from finance_coffee_lots first (has FK to coffee_records)
      DELETE FROM public.finance_coffee_lots
      WHERE coffee_record_id = NEW.record_id::uuid;
      
      -- 2. Delete associated payment records
      DELETE FROM public.payment_records 
      WHERE batch_number IN (
        SELECT batch_number FROM public.coffee_records 
        WHERE id = NEW.record_id::uuid
      );
      
      -- 3. Delete associated quality assessments
      DELETE FROM public.quality_assessments 
      WHERE store_record_id = NEW.record_id::uuid;
      
      -- 4. Now safe to delete the coffee record
      DELETE FROM public.coffee_records 
      WHERE id = NEW.record_id::uuid;
      
      -- Log the cascading deletions
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
        'related_records',
        NEW.record_id,
        'Cascaded deletion due to coffee record deletion',
        COALESCE(NEW.reviewed_by, 'System'),
        'Admin',
        jsonb_build_object('parent_table', 'coffee_records', 'parent_id', NEW.record_id)
      );
    ELSE
      -- Handle other table types
      IF NEW.table_name = 'suppliers' THEN
        DELETE FROM public.contract_approvals 
        WHERE contract_id IN (
          SELECT id FROM public.supplier_contracts 
          WHERE supplier_id::text = NEW.record_id
        );
        
        DELETE FROM public.supplier_contracts 
        WHERE supplier_id::text = NEW.record_id;
      END IF;
      
      -- Execute main deletion
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE id = $1', NEW.table_name) 
        USING NEW.record_id::uuid;
      EXCEPTION WHEN invalid_text_representation THEN
        EXECUTE format('DELETE FROM public.%I WHERE id = $1', NEW.table_name) 
        USING NEW.record_id;
      END;
    END IF;
    
    -- Log the main deletion
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
$$;

-- Recreate the trigger
CREATE TRIGGER execute_approved_deletion_trigger
  AFTER UPDATE ON deletion_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
  EXECUTE FUNCTION execute_approved_deletion();