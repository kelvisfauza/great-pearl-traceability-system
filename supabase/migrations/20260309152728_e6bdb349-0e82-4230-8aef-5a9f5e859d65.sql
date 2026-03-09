
CREATE OR REPLACE FUNCTION public.get_user_balance_safe(user_email text)
RETURNS TABLE(email text, name text, auth_user_id uuid, wallet_balance numeric, pending_withdrawals numeric, available_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
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
      le.user_id,
      SUM(le.amount) as balance
    FROM ledger_entries le
    WHERE le.entry_type IN ('LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT')
    GROUP BY le.user_id
  ) ledger ON ledger.user_id = public.get_unified_user_id(e.email)
  LEFT JOIN (
    SELECT 
      wr.user_id::text as user_id,
      SUM(wr.amount) as pending_amount
    FROM withdrawal_requests wr
    WHERE wr.status IN ('pending', 'processing', 'pending_approval', 'pending_admin_2', 'pending_admin_3', 'pending_finance')
    GROUP BY wr.user_id
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
        le.user_id,
        SUM(le.amount) as balance
      FROM ledger_entries le
      WHERE le.user_id = public.get_unified_user_id(user_email)
        AND le.entry_type IN ('LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT')
      GROUP BY le.user_id
    ) ledger
    LEFT JOIN (
      SELECT 
        wr.user_id::text as user_id,
        SUM(wr.amount) as pending_amount
      FROM withdrawal_requests wr
      WHERE wr.status IN ('pending', 'processing', 'pending_approval', 'pending_admin_2', 'pending_admin_3', 'pending_finance')
        AND wr.user_id::text = public.get_unified_user_id(user_email)
      GROUP BY wr.user_id
    ) pending ON pending.user_id = ledger.user_id;
  END IF;
END;
$$;
