CREATE OR REPLACE FUNCTION public.trg_check_treasury_funds()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF v_meta_type IN ('internal_transfer_credit','transfer_in_internal','reversal_mirror','overdraft_interest') THEN
    RETURN NEW;
  END IF;

  -- Internal synthetic accruals (no real cash movement) should not be blocked by float checks
  IF v_source IN ('OVERDRAFT_INTEREST','OVERDRAFT_FEE','LOAN_INTEREST','INTEREST_ACCRUAL') THEN
    RETURN NEW;
  END IF;

  IF COALESCE((NEW.metadata->>'bypass_treasury_check')::boolean, false) THEN
    RETURN NEW;
  END IF;

  IF v_meta_type IN ('admin_cash_withdrawal','cash_requisition','cash_payout') OR v_source = 'CASH' THEN
    SELECT cash_balance INTO v_bucket FROM public.treasury_pool_balance WHERE id = 1;
    v_bucket_label := 'Cash';
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
$function$;