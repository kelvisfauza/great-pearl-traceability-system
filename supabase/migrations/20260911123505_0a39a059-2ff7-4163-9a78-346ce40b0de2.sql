CREATE OR REPLACE FUNCTION public.treasury_resolve_account(p_source text, p_meta_type text, p_entry_type text, p_amount numeric)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE s TEXT := UPPER(COALESCE(p_source,'')); t TEXT := LOWER(COALESCE(p_meta_type,'')); e TEXT := UPPER(COALESCE(p_entry_type,''));
BEGIN
  -- wallet-to-wallet & reversals: no account movement beyond user_wallets
  IF t IN ('internal_transfer_credit','transfer_in_internal','reversal_mirror','wallet_transfer','wallet_transfer_out','wallet_transfer_in','wallet_transfer_reversal','transfer_reversal')
     OR s IN ('TRANSFER','TRANSFER_IN','TRANSFER_OUT','INTERNAL_TRANSFER','WALLET_TRANSFER','REVERSAL','REFUND') THEN
    RETURN NULL;
  END IF;
  IF p_amount > 0 THEN
    -- Refunds of rejected/failed/expired withdrawals: fee comes back out of fees income,
    -- the held amount is simply released (money never left the company).
    IF t LIKE '%fee_refund%' THEN RETURN 'fees_income'; END IF;
    IF t LIKE '%withdrawal_refund%' OR t LIKE '%withdraw_refund%' THEN RETURN NULL; END IF;
    IF t = 'absence_appeal_refund' THEN RETURN 'general'; END IF;
    -- money entering a wallet: which fund pays?
    IF t LIKE 'investment_%' OR s = 'INVEST_MATURITY' THEN RETURN 'invest_earn'; END IF;
    IF s IN ('SYSTEM_AWARD','LOYALTY','SELF_AWARD','MEETING_BONUS') OR e IN ('LOYALTY_REWARD','HOST_MEETING_BONUS','MEETING_ATTENDANCE_BONUS') THEN RETURN 'loyalty_fund'; END IF;
    IF s IN ('LOAN_DISBURSEMENT','LOAN_TOPUP_DISBURSEMENT','LOAN','OVERDRAFT_DRAW') OR e = 'LOAN_DISBURSEMENT' THEN RETURN 'loans_overdrafts'; END IF;
    IF s IN ('EXPENSE_CREDIT','EXPENSE','MEAL','PROVIDER','BUDGET_ALLOCATION','BUDGET_WITHDRAWAL','BUDGET_TRANSFER') OR t LIKE '%meal%' OR t LIKE '%provider%' OR t LIKE '%expense%' THEN RETURN 'operations'; END IF;
    IF s IN ('SALARY','BONUS','OVERTIME','OVERTIME_AWARD','ALLOWANCE','PER_DIEM','SALARY_ADVANCE','ADMIN_ADJUSTMENT','MANUAL_ADJUSTMENT') OR e IN ('MONTHLY_SALARY','BONUS','ADJUSTMENT') THEN RETURN 'general'; END IF;
    RETURN NULL; -- external deposit / topup / unknown => only user_wallets moves
  ELSE
    -- money leaving a wallet: where does it land?
    IF t IN ('investment_lock','auto_salary_investment') OR s = 'INVESTMENT' THEN RETURN 'invest_earn'; END IF;
    IF s IN ('LOAN_INTEREST','OVERDRAFT_INTEREST','OVERDRAFT_FEE','OVERDRAFT_PENALTY','LOAN_PENALTY','STATEMENT_FEE') THEN RETURN 'profits'; END IF;
    IF s IN ('WITHDRAW_FEE','GOSENTE_FEE','FEE') OR t LIKE '%service_fee%' THEN RETURN 'fees_income'; END IF;
    IF s IN ('LOAN_REPAYMENT','OVERDRAFT_REPAY','OVERDRAFT_RECOVERY','SALARY_ADVANCE_REPAYMENT','SALARY_ADVANCE') OR e IN ('LOAN_REPAYMENT','LOAN_RECOVERY','ADVANCE_RECOVERY') THEN RETURN 'loans_overdrafts'; END IF;
    IF s IN ('SYSTEM_DEDUCTION','PENALTY','ADMIN_ADJUSTMENT','MANUAL_ADJUSTMENT') THEN RETURN 'general'; END IF;
    RETURN NULL; -- external withdrawal
  END IF;
END; $function$;