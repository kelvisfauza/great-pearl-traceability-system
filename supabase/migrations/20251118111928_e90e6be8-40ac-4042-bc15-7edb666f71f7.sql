-- Fix SECURITY DEFINER functions missing SET search_path = public
-- This prevents search_path manipulation attacks

-- Update all SECURITY DEFINER functions to include SET search_path = public

-- Permission checking functions
CREATE OR REPLACE FUNCTION public.can_bypass_sms_verification(user_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE email = user_email 
    AND bypass_sms_verification = true 
    AND status = 'Active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_ip_whitelisted(check_ip text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.network_whitelist 
    WHERE ip_address = check_ip 
    AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND role = 'Super Admin'
    AND status = 'Active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_administrator()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('Administrator', 'Super Admin')
    AND status = 'Active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_permission(permission_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND status = 'Active'
    AND (
      role = 'Super Admin'
      OR permission_name = ANY(permissions)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_role()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND role = 'User'
    AND status = 'Active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor_or_above()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('Supervisor', 'Manager', 'Administrator', 'Super Admin')
    AND status = 'Active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('Manager', 'Administrator', 'Super Admin')
    AND status = 'Active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.employees 
  WHERE auth_user_id = auth.uid() 
  AND status = 'Active';
  
  RETURN COALESCE(user_role, 'User');
END;
$$;

CREATE OR REPLACE FUNCTION public.can_perform_action(action_type text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := public.get_user_role();
  
  IF user_role = 'Super Admin' THEN
    RETURN true;
  END IF;
  
  IF user_role IN ('Manager', 'Administrator') THEN
    RETURN action_type IN ('view', 'create', 'edit', 'approve', 'print', 'export', 'delete');
  END IF;
  
  IF user_role = 'Supervisor' THEN
    RETURN action_type IN ('view', 'create', 'edit', 'export');
  END IF;
  
  IF user_role = 'User' THEN
    RETURN action_type IN ('view', 'create');
  END IF;
  
  RETURN false;
END;
$$;

-- Wallet balance functions
CREATE OR REPLACE FUNCTION public.get_wallet_balance(user_uuid UUID)
RETURNS NUMERIC 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM public.ledger_entries WHERE user_id = user_uuid),
    0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_withdrawals(user_uuid UUID)
RETURNS NUMERIC 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM public.withdrawal_requests 
     WHERE user_id = user_uuid 
     AND status IN ('pending', 'approved', 'processing')),
    0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_available_to_request(user_uuid UUID)
RETURNS NUMERIC 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_balance NUMERIC;
  pending_withdrawals NUMERIC;
BEGIN
  wallet_balance := public.get_wallet_balance(user_uuid);
  pending_withdrawals := public.get_pending_withdrawals(user_uuid);
  
  RETURN GREATEST(0, wallet_balance - pending_withdrawals);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_wallet_balance_safe(user_uuid text)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM public.ledger_entries WHERE user_id = user_uuid),
    0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_withdrawals_safe(user_uuid text)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM public.withdrawal_requests 
     WHERE user_id = user_uuid 
     AND status IN ('pending', 'approved', 'processing')),
    0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_available_to_request_safe(user_uuid text)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_balance NUMERIC;
  pending_withdrawals NUMERIC;
BEGIN
  wallet_balance := public.get_wallet_balance_safe(user_uuid);
  pending_withdrawals := public.get_pending_withdrawals_safe(user_uuid);
  
  RETURN GREATEST(0, wallet_balance - pending_withdrawals);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_wallet_balance_text(user_uuid text)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM public.ledger_entries WHERE user_id = user_uuid),
    0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_withdrawals_text(user_uuid text)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM public.withdrawal_requests 
     WHERE user_id = user_uuid 
     AND status IN ('pending', 'approved', 'processing')),
    0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_available_to_request_text(user_uuid text)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_balance NUMERIC;
  pending_withdrawals NUMERIC;
BEGIN
  wallet_balance := public.get_wallet_balance_text(user_uuid);
  pending_withdrawals := public.get_pending_withdrawals_text(user_uuid);
  
  RETURN GREATEST(0, wallet_balance - pending_withdrawals);
END;
$$;

-- User data functions
CREATE OR REPLACE FUNCTION public.get_user_balance_data(user_email text)
RETURNS TABLE(
  email text, 
  name text, 
  auth_user_id uuid, 
  wallet_balance numeric, 
  pending_withdrawals numeric, 
  available_balance numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  WHERE e.status = 'Active' AND e.email = user_email;
END;
$$;

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
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION public.get_unified_user_id(input_email text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE input_email
    WHEN 'denis@farmflow.ug' THEN RETURN 'JSxZYOSxmde6Cqra4clQNc92mRS2';
    WHEN 'kibaba@farmflow.ug' THEN RETURN 'kibaba_nicholus_temp_id';
    WHEN 'tumwine@farmflow.ug' THEN RETURN 'alex_tumwine_temp_id';
    WHEN 'timothy@farmflow.ug' THEN RETURN 'hr_manager_temp_id';
    WHEN 'fauza@farmflow.ug' THEN RETURN 'kusa_fauza_temp_id';
    WHEN 'nicholusscottlangz@gmail.com' THEN RETURN '5fe8c99d-ee15-484d-8765-9bd4b37f961f';
    ELSE RETURN input_email;
  END CASE;
END;
$$;

-- Conversation security function
CREATE OR REPLACE FUNCTION public.user_is_conversation_participant(conversation_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_uuid
    AND user_id = auth.uid()
  );
$$;

-- Auth checking function
CREATE OR REPLACE FUNCTION public.check_auth_user_exists(user_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'user_id', user_uuid,
    'message', 'Use Supabase dashboard to verify auth user exists',
    'employee_record_found', true
  );
END;
$$;