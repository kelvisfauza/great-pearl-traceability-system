CREATE OR REPLACE FUNCTION public.trg_ledger_to_treasury()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  ELSIF v_source IN ('SELF_DEPOSIT','TOPUP') OR v_meta_type LIKE '%bank%' THEN
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
$$;

-- BEFORE trigger: hard block insufficient funds
CREATE OR REPLACE FUNCTION public.trg_check_treasury_funds()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool NUMERIC;
  v_amount NUMERIC;
  v_source TEXT;
  v_meta_type TEXT;
  v_direction TEXT;
BEGIN
  v_amount := ABS(COALESCE(NEW.amount, 0));
  IF v_amount = 0 THEN RETURN NEW; END IF;
  IF NEW.amount >= 0 THEN RETURN NEW; END IF;

  v_source := UPPER(COALESCE(NEW.source_category, NEW.metadata->>'source', ''));
  v_meta_type := COALESCE(NEW.metadata->>'type','');

  IF v_meta_type IN ('internal_transfer_credit','transfer_in_internal','reversal_mirror') THEN
    RETURN NEW;
  END IF;

  IF COALESCE((NEW.metadata->>'bypass_treasury_check')::boolean, false) THEN
    RETURN NEW;
  END IF;

  SELECT current_balance INTO v_pool FROM public.treasury_pool_balance WHERE id = 1;

  IF v_pool < v_amount THEN
    RAISE EXCEPTION 'Insufficient treasury funds: pool has % UGX, this transaction requires % UGX. Please top up the Treasury Pool before processing.',
      v_pool, v_amount USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_treasury_funds ON public.ledger_entries;
CREATE TRIGGER trg_check_treasury_funds
  BEFORE INSERT ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_treasury_funds();

-- Backfill function
CREATE OR REPLACE FUNCTION public.backfill_treasury_from_ledger()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_total_credit NUMERIC := 0;
  v_total_debit NUMERIC := 0;
  v_final NUMERIC;
  rec RECORD;
  v_email TEXT; v_name TEXT;
  v_source TEXT; v_meta_type TEXT;
  v_channel public.treasury_channel;
  v_category public.treasury_category;
  v_direction public.treasury_direction;
  v_amount NUMERIC;
  v_uid UUID;
BEGIN
  DELETE FROM public.treasury_pool_entries WHERE COALESCE((metadata->>'backfill')::boolean, false) = true;
  UPDATE public.treasury_pool_balance SET current_balance = 0, updated_at = now() WHERE id = 1;

  FOR rec IN SELECT * FROM public.ledger_entries ORDER BY created_at ASC LOOP
    v_amount := ABS(COALESCE(rec.amount, 0));
    IF v_amount = 0 THEN CONTINUE; END IF;

    v_source := UPPER(COALESCE(rec.source_category, rec.metadata->>'source', ''));
    v_meta_type := COALESCE(rec.metadata->>'type','');

    IF v_meta_type IN ('internal_transfer_credit','transfer_in_internal','reversal_mirror') THEN
      CONTINUE;
    END IF;

    IF rec.amount > 0 THEN v_direction := 'credit'; ELSE v_direction := 'debit'; END IF;

    BEGIN v_uid := rec.user_id::uuid; EXCEPTION WHEN others THEN v_uid := NULL; END;
    v_email := NULL; v_name := NULL;
    IF v_uid IS NOT NULL THEN
      SELECT email, name INTO v_email, v_name FROM public.employees WHERE auth_user_id = v_uid LIMIT 1;
    END IF;

    IF v_meta_type IN ('admin_cash_withdrawal','cash_requisition','cash_payout') OR v_source = 'CASH' THEN
      v_channel := 'cash';
    ELSIF v_source IN ('SELF_DEPOSIT','TOPUP') THEN
      v_channel := 'bank';
    ELSE
      v_channel := 'yo_payments';
    END IF;

    IF v_source = 'SALARY' THEN
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
    ELSIF v_meta_type LIKE '%provider%' OR v_meta_type LIKE '%meal%' THEN
      v_category := 'provider_payout';
    ELSIF rec.entry_type = 'DEPOSIT' OR v_direction = 'credit' THEN
      v_category := 'deposit'; v_direction := 'credit';
    ELSE
      v_category := 'withdrawal';
    END IF;

    UPDATE public.treasury_pool_balance
      SET current_balance = current_balance + (CASE WHEN v_direction = 'credit' THEN v_amount ELSE -v_amount END)
      WHERE id = 1
      RETURNING current_balance INTO v_final;

    INSERT INTO public.treasury_pool_entries (
      direction, amount, channel, category, reference,
      related_user_email, related_user_name, description,
      performed_by, balance_after, metadata, created_at
    ) VALUES (
      v_direction, v_amount, v_channel, v_category, rec.reference,
      v_email, v_name, COALESCE(rec.metadata->>'description', rec.entry_type::text),
      'backfill', v_final,
      jsonb_build_object('ledger_entry_id', rec.id, 'source', v_source, 'meta_type', v_meta_type, 'backfill', true),
      rec.created_at
    );

    v_count := v_count + 1;
    IF v_direction = 'credit' THEN v_total_credit := v_total_credit + v_amount;
    ELSE v_total_debit := v_total_debit + v_amount; END IF;
  END LOOP;

  RETURN jsonb_build_object('processed', v_count, 'total_credit', v_total_credit, 'total_debit', v_total_debit, 'final_balance', v_final);
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_treasury_from_ledger() TO authenticated, service_role;

SELECT public.backfill_treasury_from_ledger();