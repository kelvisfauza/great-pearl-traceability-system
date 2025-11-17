-- Create a function to reset existing money requests to pending admin approval
CREATE OR REPLACE FUNCTION reset_money_requests_to_pending_admin()
RETURNS TABLE (
  id uuid,
  request_type text,
  amount numeric,
  old_stage text,
  new_stage text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE money_requests
  SET 
    approval_stage = 'pending_admin',
    status = 'pending',
    admin_approved = false,
    finance_approved = false,
    admin_approved_at = NULL,
    admin_approved_by = NULL,
    finance_approved_at = NULL,
    finance_approved_by = NULL
  WHERE status != 'rejected' 
    AND approval_stage NOT IN ('pending_admin', 'completed')
  RETURNING 
    money_requests.id,
    money_requests.request_type,
    money_requests.amount,
    approval_stage AS old_stage,
    'pending_admin'::text AS new_stage;
END;
$$;

-- Execute the function to reset all existing requests
SELECT * FROM reset_money_requests_to_pending_admin();