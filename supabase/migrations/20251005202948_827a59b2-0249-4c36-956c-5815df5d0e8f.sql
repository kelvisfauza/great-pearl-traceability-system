-- Create admin function to delete all system data
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
  DELETE FROM supplier_payments;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM supplier_advances;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM finance_coffee_lots;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM finance_cash_transactions;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM money_requests;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM contract_approvals;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM supplier_contracts;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM payment_records;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM sales_transactions;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM purchase_orders;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM inventory_items;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM daily_tasks;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM audit_logs;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM edit_requests;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM workflow_steps;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM reports;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM metrics;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM cash_sessions;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM suppliers;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM marketing_campaigns;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  DELETE FROM sales_contracts;
  GET DIAGNOSTICS row_count = ROW_COUNT;
  total_deleted := total_deleted + row_count;
  
  -- Reset storage locations
  DELETE FROM storage_locations;
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