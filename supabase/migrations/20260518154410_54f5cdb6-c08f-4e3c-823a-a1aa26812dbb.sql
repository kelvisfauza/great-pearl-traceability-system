CREATE OR REPLACE FUNCTION public.get_all_wallet_balances()
RETURNS TABLE(user_id text, wallet_balance numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT le.user_id, SUM(le.amount) AS wallet_balance
  FROM public.ledger_entries le
  WHERE le.entry_type IN (
    'LOYALTY_REWARD','BONUS','DEPOSIT','WITHDRAWAL','ADJUSTMENT',
    'MONTHLY_SALARY','ADVANCE_RECOVERY','LOAN_DISBURSEMENT','LOAN_REPAYMENT','LOAN_RECOVERY'
  )
  AND NOT (
    COALESCE(le.metadata->>'allowance_type','') IN ('airtime_allowance','data_allowance')
    AND le.entry_type IN ('DEPOSIT','PAYOUT')
  )
  GROUP BY le.user_id;
$function$;