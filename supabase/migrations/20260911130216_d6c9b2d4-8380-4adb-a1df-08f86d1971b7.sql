
CREATE OR REPLACE FUNCTION public.treasury_resolve_account(p_source text, p_meta_type text, p_entry_type text, p_amount numeric)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE s TEXT := UPPER(COALESCE(p_source,'')); t TEXT := LOWER(COALESCE(p_meta_type,'')); e TEXT := UPPER(COALESCE(p_entry_type,''));
BEGIN
  IF t IN ('internal_transfer_credit','transfer_in_internal','reversal_mirror','wallet_transfer','wallet_transfer_out','wallet_transfer_in','wallet_transfer_reversal','transfer_reversal')
     OR s IN ('TRANSFER','TRANSFER_IN','TRANSFER_OUT','INTERNAL_TRANSFER','WALLET_TRANSFER','REVERSAL','REFUND') THEN
    RETURN NULL;
  END IF;
  IF p_amount > 0 THEN
    IF t LIKE '%fee_refund%' THEN RETURN 'fees_income'; END IF;
    IF t LIKE '%withdrawal_refund%' OR t LIKE '%withdraw_refund%' THEN RETURN NULL; END IF;
    IF t = 'absence_appeal_refund' THEN RETURN 'general'; END IF;
    IF t LIKE 'investment_%' OR s = 'INVEST_MATURITY' THEN RETURN 'invest_earn'; END IF;
    IF s IN ('SYSTEM_AWARD','LOYALTY','SELF_AWARD','MEETING_BONUS') OR e IN ('LOYALTY_REWARD','HOST_MEETING_BONUS','MEETING_ATTENDANCE_BONUS') THEN RETURN 'loyalty_fund'; END IF;
    IF s IN ('LOAN_DISBURSEMENT','LOAN_TOPUP_DISBURSEMENT','LOAN','OVERDRAFT_DRAW') OR e = 'LOAN_DISBURSEMENT' THEN RETURN 'loans_overdrafts'; END IF;
    IF s IN ('EXPENSE_CREDIT','EXPENSE','MEAL','PROVIDER','BUDGET_ALLOCATION','BUDGET_WITHDRAWAL','BUDGET_TRANSFER') OR t LIKE '%meal%' OR t LIKE '%provider%' OR t LIKE '%expense%' THEN RETURN 'operations'; END IF;
    IF s IN ('SALARY','BONUS','OVERTIME','OVERTIME_AWARD','ALLOWANCE','PER_DIEM','SALARY_ADVANCE','ADMIN_ADJUSTMENT','MANUAL_ADJUSTMENT') OR e IN ('MONTHLY_SALARY','BONUS','ADJUSTMENT') THEN RETURN 'general'; END IF;
    -- Genuine outside money entering the system: no internal fund is spent
    IF s IN ('SELF_DEPOSIT','TOPUP','DEPOSIT','BANK_DEPOSIT','MOMO_DEPOSIT','COLLECTION','MILLING_COLLECTION','EXTERNAL_DEPOSIT','CUSTOMER_PAYMENT')
       OR t LIKE '%deposit%' OR t LIKE '%topup%' OR t LIKE '%top_up%' OR t LIKE '%collection%' THEN
      RETURN NULL;
    END IF;
    -- Anything else is company money: it must come from the General Account
    RETURN 'general';
  ELSE
    IF t IN ('investment_lock','auto_salary_investment') OR s = 'INVESTMENT' THEN RETURN 'invest_earn'; END IF;
    IF s IN ('LOAN_INTEREST','OVERDRAFT_INTEREST','OVERDRAFT_FEE','OVERDRAFT_PENALTY','LOAN_PENALTY','STATEMENT_FEE') THEN RETURN 'profits'; END IF;
    IF s IN ('WITHDRAW_FEE','GOSENTE_FEE','FEE') OR t LIKE '%service_fee%' THEN RETURN 'fees_income'; END IF;
    IF s IN ('LOAN_REPAYMENT','OVERDRAFT_REPAY','OVERDRAFT_RECOVERY','SALARY_ADVANCE_REPAYMENT','SALARY_ADVANCE') OR e IN ('LOAN_REPAYMENT','LOAN_RECOVERY','ADVANCE_RECOVERY') THEN RETURN 'loans_overdrafts'; END IF;
    IF s IN ('SYSTEM_DEDUCTION','PENALTY','ADMIN_ADJUSTMENT','MANUAL_ADJUSTMENT') THEN RETURN 'general'; END IF;
    RETURN NULL;
  END IF;
END; $function$;

-- Direct (non-wallet) company payouts: must draw from a named treasury account
CREATE OR REPLACE FUNCTION public.treasury_external_payout(
  p_account text,
  p_amount numeric,
  p_reference text,
  p_description text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_performed_by text DEFAULT 'system',
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_new NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('ok', true, 'skipped', true); END IF;
  IF EXISTS (
    SELECT 1 FROM public.treasury_account_entries
    WHERE reference = p_reference AND account_code = p_account AND direction = 'debit'
  ) THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;
  v_new := public.treasury_account_post(
    p_account, 'debit', p_amount, 'external', p_reference, NULL,
    p_email, p_name, COALESCE(p_description, 'Direct payout'), COALESCE(p_performed_by,'system'),
    COALESCE(p_metadata,'{}'::jsonb) || jsonb_build_object('external_payout', true)
  );
  RETURN jsonb_build_object('ok', true, 'balance_after', v_new);
END; $$;

CREATE OR REPLACE FUNCTION public.treasury_external_reverse(
  p_account text,
  p_amount numeric,
  p_reference text,
  p_description text DEFAULT NULL,
  p_performed_by text DEFAULT 'system'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_new NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('ok', true, 'skipped', true); END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.treasury_account_entries
    WHERE reference = p_reference AND account_code = p_account AND direction = 'debit'
  ) THEN
    RETURN jsonb_build_object('ok', true, 'nothing_to_reverse', true);
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.treasury_account_entries
    WHERE reference = p_reference AND account_code = p_account AND direction = 'credit'
  ) THEN
    RETURN jsonb_build_object('ok', true, 'already_reversed', true);
  END IF;
  v_new := public.treasury_account_post(
    p_account, 'credit', p_amount, 'external', p_reference, NULL,
    NULL, NULL, COALESCE(p_description, 'Payout failed — funds returned'), COALESCE(p_performed_by,'system'),
    jsonb_build_object('external_payout_reversal', true)
  );
  RETURN jsonb_build_object('ok', true, 'balance_after', v_new);
END; $$;

REVOKE ALL ON FUNCTION public.treasury_external_payout(text,numeric,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.treasury_external_reverse(text,numeric,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.treasury_external_payout(text,numeric,text,text,text,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.treasury_external_reverse(text,numeric,text,text,text) TO service_role;
