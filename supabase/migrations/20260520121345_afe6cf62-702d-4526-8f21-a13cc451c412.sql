CREATE OR REPLACE FUNCTION public.get_effective_wallet_balance(p_user_id text)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(le.amount), 0)
  FROM public.ledger_entries le
  WHERE le.user_id = p_user_id
    AND le.entry_type IN (
      'LOYALTY_REWARD',
      'BONUS',
      'DEPOSIT',
      'WITHDRAWAL',
      'ADJUSTMENT',
      'MONTHLY_SALARY',
      'ADVANCE_RECOVERY',
      'LOAN_DISBURSEMENT',
      'LOAN_REPAYMENT',
      'LOAN_RECOVERY',
      'MEETING_HOST_BONUS',
      'MEETING_ATTENDANCE_BONUS'
    )
    AND NOT (
      COALESCE(le.metadata->>'allowance_type', '') IN ('airtime_allowance', 'data_allowance')
      AND le.entry_type IN ('DEPOSIT', 'PAYOUT')
    );
$function$;