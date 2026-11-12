CREATE OR REPLACE FUNCTION public.trg_check_treasury_funds() RETURNS TRIGGER AS $$
DECLARE
  v_bucket NUMERIC;
  v_amount NUMERIC;
  v_source TEXT;
  v_meta_type TEXT;
  v_bucket_label TEXT;
BEGIN
  v_amount := ABS(COALESCE(NEW.amount, 0));
  IF v_amount = 0 THEN RETURN NEW; END IF;
  IF NEW.amount >= 0 THEN RETURN NEW; END IF;

  v_source := UPPER(COALESCE(NEW.source_category, NEW.metadata->>'source', ''));
  v_meta_type := COALESCE(NEW.metadata->>'type','');

  IF v_meta_type IN (
    'internal_transfer_credit','transfer_in_internal','reversal_mirror',
    'overdraft_interest','overdraft_penalty','overdraft_fee','wallet_transfer_out','wallet_transfer_in',
    'wallet_transfer_reversal'
  ) THEN
    RETURN NEW;
  END IF;

  IF v_source IN (
    'OVERDRAFT_INTEREST','OVERDRAFT_PENALTY','OVERDRAFT_FEE','LOAN_INTEREST','INTEREST_ACCRUAL',
    'INTERNAL_TRANSFER','WALLET_TRANSFER','LOYALTY','BONUS','REVERSAL'
  ) THEN
    RETURN NEW;
  END IF;

  IF COALESCE((NEW.metadata->>'bypass_treasury_check')::boolean, false) THEN
    RETURN NEW;
  END IF;

  -- Finance-released withdrawals are checked against the named treasury
  -- account and the chosen provider inside the release routine.
  IF NEW.reference LIKE 'WD-APPROVAL-%' AND NEW.metadata ? 'approval_request_id' THEN
    RETURN NEW;
  END IF;

  IF v_meta_type IN ('admin_cash_withdrawal','cash_requisition','cash_payout') OR v_source = 'CASH' THEN
    SELECT cash_balance INTO v_bucket FROM public.treasury_pool_balance WHERE id = 1;
    v_bucket_label := 'Cash';
  ELSIF NEW.metadata->>'channel' = 'BANK_DEPOSIT' OR v_meta_type LIKE '%bank%' THEN
    SELECT bank_balance INTO v_bucket FROM public.treasury_pool_balance WHERE id = 1;
    v_bucket_label := 'Cash at Bank';
  ELSE
    SELECT yo_balance INTO v_bucket FROM public.treasury_pool_balance WHERE id = 1;
    v_bucket_label := 'Yo Payments float';
  END IF;

  IF v_bucket < v_amount THEN
    RAISE EXCEPTION 'Insufficient % funds: bucket has % UGX, this transaction requires % UGX. Please top up before processing.',
      v_bucket_label, v_bucket, v_amount USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.trg_ledger_to_treasury() RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
  v_name TEXT;
  v_source TEXT;
  v_desc TEXT;
  v_channel public.treasury_channel := 'yo_payments';
  v_category public.treasury_category;
  v_amount NUMERIC;
  v_meta_type TEXT;
  v_direction public.treasury_direction;
  v_uid UUID;
BEGIN
  v_source := UPPER(COALESCE(NEW.source_category, NEW.metadata->>'source', ''));
  v_desc := COALESCE(NEW.metadata->>'description', NEW.entry_type::text);
  v_meta_type := COALESCE(NEW.metadata->>'type','');
  v_amount := ABS(COALESCE(NEW.amount, 0));

  IF v_amount = 0 THEN RETURN NEW; END IF;

  IF v_meta_type IN ('internal_transfer_credit','transfer_in_internal','reversal_mirror') THEN
    RETURN NEW;
  END IF;

  IF NEW.amount > 0 THEN v_direction := 'credit'; ELSE v_direction := 'debit'; END IF;

  BEGIN v_uid := NEW.user_id::uuid; EXCEPTION WHEN others THEN v_uid := NULL; END;
  IF v_uid IS NOT NULL THEN
    SELECT email, name INTO v_email, v_name
    FROM public.employees WHERE auth_user_id = v_uid LIMIT 1;
  END IF;

  IF v_meta_type IN ('admin_cash_withdrawal','cash_requisition','cash_payout') OR v_source = 'CASH' THEN
    v_channel := 'cash';
  ELSIF v_source IN ('SELF_DEPOSIT','TOPUP') OR v_meta_type LIKE '%bank%' OR NEW.metadata->>'channel' = 'BANK_DEPOSIT' THEN
    v_channel := 'bank';
  ELSE
    v_channel := 'yo_payments';
  END IF;

  IF v_source = 'SALARY' OR v_meta_type LIKE '%salary%' THEN
    v_category := CASE WHEN v_direction = 'debit' THEN 'provider_payout' ELSE 'deposit' END;
  ELSIF v_source IN ('LOAN_DISBURSEMENT','LOAN_TOPUP_DISBURSEMENT') THEN
    v_category := 'provider_payout';
  ELSIF v_source = 'LOAN_REPAYMENT' THEN
    v_category := 'deposit';
  ELSIF v_source IN ('BONUS','OVERTIME','ALLOWANCE','PER_DIEM','SYSTEM_AWARD','LOYALTY','SELF_AWARD','EXPENSE_CREDIT','EXPENSE') THEN
    IF v_direction = 'credit' THEN v_direction := 'debit'; END IF;
    v_category := 'provider_payout';
  ELSIF v_source LIKE '%TRANSFER%' OR v_meta_type LIKE '%transfer%' THEN
    v_category := 'transfer';
  ELSIF v_meta_type LIKE '%provider%' OR v_meta_type LIKE '%meal%' OR v_source LIKE '%PROVIDER%' THEN
    v_category := 'provider_payout';
  ELSIF NEW.entry_type = 'DEPOSIT' OR v_direction = 'credit' THEN
    v_category := 'deposit'; v_direction := 'credit';
  ELSE
    v_category := 'withdrawal';
  END IF;

  PERFORM public.record_treasury_entry(
    v_direction, v_amount, v_channel, v_category,
    NEW.reference, v_email, v_name, v_desc,
    COALESCE(NEW.metadata->>'initiated_by','system'),
    jsonb_build_object('ledger_entry_id', NEW.id, 'source', v_source, 'meta_type', v_meta_type, 'auto', true)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;