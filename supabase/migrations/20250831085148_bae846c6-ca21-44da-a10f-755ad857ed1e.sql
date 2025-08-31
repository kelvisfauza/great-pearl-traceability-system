-- Insert missing employee record for Kibaba
INSERT INTO employees (
  name, 
  email, 
  phone, 
  position, 
  department, 
  role, 
  permissions, 
  status, 
  salary,
  auth_user_id
) VALUES (
  'Kibaba Nicholus',
  'kibaba@farmflow.ug',
  '+256700000002',
  'Store Manager',
  'Store',
  'Store Manager',
  ARRAY['store_management', 'coffee_records', 'quality_assessments', 'reports'],
  'Active',
  250000,
  NULL  -- Will be set when they log in with Supabase
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  position = EXCLUDED.position,
  department = EXCLUDED.department,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  status = EXCLUDED.status,
  salary = EXCLUDED.salary;

-- Also create fallback function that works even without employee record
CREATE OR REPLACE FUNCTION public.get_user_balance_safe(user_email text)
RETURNS TABLE(
  email text,
  name text,
  auth_user_id uuid,
  wallet_balance numeric,
  pending_withdrawals numeric,
  available_balance numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First try with employee record
  RETURN QUERY
  SELECT 
    e.email,
    e.name,
    e.auth_user_id,
    COALESCE(ledger.balance, 0) as wallet_balance,
    COALESCE(pending.pending_amount, 0) as pending_withdrawals,
    GREATEST(0, COALESCE(ledger.balance, 0) - COALESCE(pending.pending_amount, 0)) as available_balance
  FROM employees e
  LEFT JOIN (
    SELECT 
      user_id,
      SUM(amount) as balance
    FROM ledger_entries 
    GROUP BY user_id
  ) ledger ON ledger.user_id = public.get_unified_user_id(e.email)
  LEFT JOIN (
    SELECT 
      user_id,
      SUM(amount) as pending_amount
    FROM withdrawal_requests 
    WHERE status IN ('pending', 'approved', 'processing')
    GROUP BY user_id
  ) pending ON pending.user_id = public.get_unified_user_id(e.email)
  WHERE e.email = user_email;
  
  -- If no employee record found, try direct ledger lookup
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      user_email as email,
      'Unknown User' as name,
      NULL::uuid as auth_user_id,
      COALESCE(ledger.balance, 0) as wallet_balance,
      COALESCE(pending.pending_amount, 0) as pending_withdrawals,
      GREATEST(0, COALESCE(ledger.balance, 0) - COALESCE(pending.pending_amount, 0)) as available_balance
    FROM (
      SELECT 
        user_id,
        SUM(amount) as balance
      FROM ledger_entries 
      WHERE user_id = public.get_unified_user_id(user_email)
      GROUP BY user_id
    ) ledger
    LEFT JOIN (
      SELECT 
        user_id,
        SUM(amount) as pending_amount
      FROM withdrawal_requests 
      WHERE status IN ('pending', 'approved', 'processing')
        AND user_id = public.get_unified_user_id(user_email)
      GROUP BY user_id
    ) pending ON pending.user_id = ledger.user_id;
  END IF;
END;
$$;