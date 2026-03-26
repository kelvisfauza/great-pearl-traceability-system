CREATE OR REPLACE FUNCTION public.get_all_wallet_balances()
RETURNS TABLE(user_id text, wallet_balance numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    le.user_id,
    SUM(le.amount) as wallet_balance
  FROM ledger_entries le
  WHERE le.entry_type IN ('LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT')
  GROUP BY le.user_id;
$$;