-- Update admin function to include WHERE clauses for DELETE
CREATE OR REPLACE FUNCTION public.admin_delete_all_system_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_deleted INTEGER := 0;
  row_count INTEGER;
BEGIN
  -- Only allow admins to execute this
  IF NOT public.is_current_user_admin() THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only administrators can delete all system data'
    );
  END IF;

  -- Delete from Supabase tables (children first, parents last)
  -- Use WHERE true to delete all rows
  DELETE FROM supplier_payments WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM supplier_advances WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM finance_coffee_lots WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM finance_cash_transactions WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM money_requests WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM contract_approvals WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM supplier_contracts WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM payment_records WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM sales_transactions WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM purchase_orders WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM inventory_items WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM daily_tasks WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM audit_logs WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM edit_requests WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM workflow_steps WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM reports WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM metrics WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM cash_sessions WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM suppliers WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM marketing_campaigns WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM sales_contracts WHERE true;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  -- Reset storage locations
  DELETE FROM storage_locations WHERE true;
  INSERT INTO storage_locations (name, capacity, current_occupancy, occupancy_percentage) 
  VALUES 
    ('Store 1', 30000, 0, 0),
    ('Store 2', 40000, 0, 0);

  RETURN json_build_object(
    'success', true,
    'message', 'Successfully deleted all system data',
    'deleted_count', total_deleted
  );
END;
$$;