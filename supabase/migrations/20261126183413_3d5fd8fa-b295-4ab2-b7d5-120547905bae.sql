CREATE OR REPLACE FUNCTION public.record_treasury_entry(p_direction treasury_direction, p_amount numeric, p_channel treasury_channel, p_category treasury_category, p_reference text, p_related_user_email text, p_related_user_name text, p_description text, p_performed_by text, p_metadata jsonb)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_delta NUMERIC; v_new_balance NUMERIC; v_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN RETURN NULL; END IF;
  v_delta := CASE WHEN p_direction = 'credit' THEN ABS(p_amount) ELSE -ABS(p_amount) END;
  IF p_channel = 'internal' AND p_category = 'adjustment' THEN
    -- Internal account moves never change external cash/Yo/bank balances.
    SELECT current_balance INTO v_new_balance FROM public.treasury_pool_balance WHERE id = 1;
  ELSIF p_channel = 'cash' THEN
    UPDATE public.treasury_pool_balance SET cash_balance = cash_balance + v_delta,
      current_balance = (cash_balance + v_delta) + yo_balance + COALESCE(bank_balance,0), updated_at = now()
      WHERE id = 1 RETURNING current_balance INTO v_new_balance;
  ELSIF p_channel = 'bank' THEN
    UPDATE public.treasury_pool_balance SET bank_balance = bank_balance + v_delta,
      current_balance = cash_balance + yo_balance + (bank_balance + v_delta), updated_at = now()
      WHERE id = 1 RETURNING current_balance INTO v_new_balance;
  ELSE
    UPDATE public.treasury_pool_balance SET yo_balance = yo_balance + v_delta,
      current_balance = cash_balance + (yo_balance + v_delta) + COALESCE(bank_balance,0), updated_at = now()
      WHERE id = 1 RETURNING current_balance INTO v_new_balance;
  END IF;
  INSERT INTO public.treasury_pool_entries (direction, amount, channel, category, reference, related_user_email,
     related_user_name, description, performed_by, balance_after, metadata)
  VALUES (p_direction, ABS(p_amount), p_channel, p_category, p_reference, p_related_user_email, p_related_user_name,
     p_description, p_performed_by, v_new_balance, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_ledger_to_treasury()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_email TEXT; v_name TEXT; v_source TEXT; v_desc TEXT;
  v_channel public.treasury_channel := 'yo_payments';
  v_category public.treasury_category; v_amount NUMERIC; v_meta_type TEXT;
  v_direction public.treasury_direction; v_uid UUID; v_internal BOOLEAN := false;
BEGIN
  v_source := UPPER(COALESCE(NEW.source_category, NEW.metadata->>'source', ''));
  v_desc := COALESCE(NEW.metadata->>'description', NEW.entry_type::text);
  v_meta_type := COALESCE(NEW.metadata->>'type','');
  v_amount := ABS(COALESCE(NEW.amount, 0));
  IF v_amount = 0 THEN RETURN NEW; END IF;
  IF v_meta_type IN ('internal_transfer_credit','transfer_in_internal','reversal_mirror') THEN RETURN NEW; END IF;
  IF NEW.amount > 0 THEN v_direction := 'credit'; ELSE v_direction := 'debit'; END IF;
  BEGIN v_uid := NEW.user_id::uuid; EXCEPTION WHEN others THEN v_uid := NULL; END;
  IF v_uid IS NOT NULL THEN
    SELECT email, name INTO v_email, v_name FROM public.employees WHERE auth_user_id = v_uid LIMIT 1;
  END IF;

  -- Plain admin account-only debit: wallet -> General Account, never leaves the company.
  IF v_direction = 'debit' AND v_source IN ('ADMIN_ADJUSTMENT','OVERDRAFT_DRAW')
     AND v_desc ILIKE 'Admin debit:%' THEN
    v_internal := true;
    v_channel := 'internal'; v_category := 'adjustment';
  END IF;

  IF NOT v_internal THEN
    IF v_meta_type IN ('admin_cash_withdrawal','cash_requisition','cash_payout') OR v_source = 'CASH' THEN
      v_channel := 'cash';
    ELSIF v_source IN ('SELF_DEPOSIT','TOPUP') OR v_meta_type LIKE '%bank%' OR NEW.metadata->>'channel' = 'BANK_DEPOSIT' THEN
      v_channel := 'bank';
    ELSE
      v_channel := 'yo_payments';
    END IF;
    IF v_source = 'SALARY' OR v_meta_type LIKE '%salary%' THEN
      v_category := CASE WHEN v_direction = 'debit' THEN 'provider_payout' ELSE 'deposit' END;
    ELSIF v_source IN ('LOAN_DISBURSEMENT','LOAN_TOPUP_DISBURSEMENT') THEN v_category := 'provider_payout';
    ELSIF v_source = 'LOAN_REPAYMENT' THEN v_category := 'deposit';
    ELSIF v_source IN ('BONUS','OVERTIME','ALLOWANCE','PER_DIEM','SYSTEM_AWARD','LOYALTY','SELF_AWARD','EXPENSE_CREDIT','EXPENSE') THEN
      IF v_direction = 'credit' THEN v_direction := 'debit'; END IF;
      v_category := 'provider_payout';
    ELSIF v_source LIKE '%TRANSFER%' OR v_meta_type LIKE '%transfer%' THEN v_category := 'transfer';
    ELSIF v_meta_type LIKE '%provider%' OR v_meta_type LIKE '%meal%' OR v_source LIKE '%PROVIDER%' THEN v_category := 'provider_payout';
    ELSIF NEW.entry_type = 'DEPOSIT' OR v_direction = 'credit' THEN v_category := 'deposit'; v_direction := 'credit';
    ELSE v_category := 'withdrawal';
    END IF;
  END IF;

  PERFORM public.record_treasury_entry(
    v_direction, v_amount, v_channel, v_category, NEW.reference, v_email, v_name,
    CASE WHEN v_internal THEN v_desc || ' (internal to General Account)' ELSE v_desc END,
    COALESCE(NEW.metadata->>'initiated_by','system'),
    jsonb_build_object('ledger_entry_id', NEW.id, 'source', v_source, 'meta_type',
      CASE WHEN v_internal THEN 'internal_admin_debit' ELSE v_meta_type END,
      'auto', true) || CASE WHEN v_internal THEN jsonb_build_object('destination_account','general') ELSE '{}'::jsonb END
  );
  RETURN NEW;
END; $function$;

-- Relabel historical plain admin debits (balances untouched; Yo balance is synced from the provider).
UPDATE public.treasury_pool_entries
SET channel = 'internal', category = 'adjustment',
    metadata = metadata || jsonb_build_object('meta_type','internal_admin_debit','destination_account','general',
      'classification_corrected_at', now(), 'previous_channel', channel::text, 'previous_category', category::text)
WHERE direction = 'debit' AND channel = 'yo_payments' AND category = 'withdrawal'
  AND description ILIKE 'Admin debit:%'
  AND UPPER(COALESCE(metadata->>'source','')) IN ('ADMIN_ADJUSTMENT','OVERDRAFT_DRAW');