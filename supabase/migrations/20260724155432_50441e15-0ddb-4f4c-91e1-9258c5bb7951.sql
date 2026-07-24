
CREATE OR REPLACE FUNCTION public.validate_source_category()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed text[] := ARRAY[
    'DEPOSIT','WITHDRAWAL','TRANSFER','TRANSFER_IN','TRANSFER_OUT',
    'SYSTEM_AWARD','SYSTEM_DEDUCTION','SALARY','SALARY_ADVANCE',
    'LOAN','LOAN_REPAYMENT','LOAN_INTEREST','LOAN_PENALTY',
    'OVERDRAFT_DRAW','OVERDRAFT_REPAY','OVERDRAFT_FEE','OVERDRAFT_INTEREST','OVERDRAFT_PENALTY',
    'INSTANT_WITHDRAWAL','WITHDRAW_FEE','GOSENTE_FEE','FEE',
    'MEAL','PROVIDER','ALLOWANCE','PER_DIEM','MEETING_BONUS','OVERTIME_AWARD',
    'INVESTMENT','INVEST_MATURITY','REFUND','MANUAL_ADJUSTMENT','ADMIN_ADJUSTMENT',
    'BUDGET_ALLOCATION','BUDGET_WITHDRAWAL','MOMO_TOPUP','CASH_TOPUP','STATEMENT_FEE',
    'SELF_DEPOSIT','INTERNAL_TRANSFER','LOAN_DISBURSEMENT','BUDGET_TRANSFER'
  ];
BEGIN
  IF NEW.source_category IS NULL OR NEW.source_category = '' THEN
    RETURN NEW;
  END IF;
  IF NOT (NEW.source_category = ANY(allowed)) THEN
    RAISE EXCEPTION 'Invalid source_category: %', NEW.source_category;
  END IF;
  RETURN NEW;
END;
$function$;

INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
VALUES
('e400bc7b-be01-4654-b9b7-7f30334e87e8','DEPOSIT',44000,'DEPOSIT-DEP-1784877759281-ebadqn','SELF_DEPOSIT',
 '{"transaction_ref":"DEP-1784877759281-ebadqn","phone":"256778536681","currency":"UGX","provider":"gosentepay","source":"mobile_money","description":"Backfill: GosentePay deposit missed because SELF_DEPOSIT category was rejected"}'::jsonb),
('e400bc7b-be01-4654-b9b7-7f30334e87e8','DEPOSIT',44000,'DEPOSIT-DEP-1784906196735-mkdmnh','SELF_DEPOSIT',
 '{"transaction_ref":"DEP-1784906196735-mkdmnh","phone":"256781121639","currency":"UGX","provider":"gosentepay","source":"mobile_money","description":"Backfill: GosentePay deposit missed because SELF_DEPOSIT category was rejected"}'::jsonb)
ON CONFLICT (reference) DO NOTHING;
