-- Function: apply overdraft recovery against a wallet credit
CREATE OR REPLACE FUNCTION public.apply_overdraft_recovery(
  p_user_id UUID,
  p_credit_amount NUMERIC,
  p_ledger_id UUID,
  p_source TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account RECORD;
  v_recover NUMERIC;
  v_new_outstanding NUMERIC;
BEGIN
  -- Find active overdraft with outstanding balance for this user
  SELECT * INTO v_account
  FROM public.overdraft_accounts
  WHERE user_id = p_user_id
    AND status = 'active'
    AND outstanding_balance > 0
  FOR UPDATE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- How much can we actually recover
  v_recover := LEAST(p_credit_amount, v_account.outstanding_balance);
  v_new_outstanding := v_account.outstanding_balance - v_recover;

  -- Update account
  UPDATE public.overdraft_accounts
  SET outstanding_balance = v_new_outstanding,
      total_recovered = total_recovered + v_recover,
      updated_at = now()
  WHERE id = v_account.id;

  -- Log overdraft transaction
  INSERT INTO public.overdraft_transactions
    (account_id, user_id, transaction_type, amount, balance_after, ledger_entry_id, reference, metadata)
  VALUES
    (v_account.id, p_user_id, 'recovery', v_recover, v_new_outstanding, p_ledger_id,
     'AUTO-RECOVERY', jsonb_build_object('source', p_source, 'original_credit', p_credit_amount));

  -- Insert offsetting negative ledger entry so the user's wallet only shows the net credit
  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, source_category)
  VALUES (
    p_user_id,
    'WITHDRAWAL',
    -v_recover,
    'OD-REC-' || v_account.id::text,
    jsonb_build_object(
      'type', 'overdraft_recovery',
      'overdraft_account_id', v_account.id,
      'recovered_from_ledger_id', p_ledger_id,
      'source', p_source,
      'description', 'Overdraft auto-recovery from incoming credit'
    ),
    'OVERDRAFT_RECOVERY'
  );

  RETURN v_recover;
END;
$$;

-- Trigger function on ledger_entries
CREATE OR REPLACE FUNCTION public.trigger_overdraft_recovery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source TEXT;
BEGIN
  -- Only positive credits trigger recovery
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;

  v_source := COALESCE(NEW.source_category, NEW.metadata->>'type', '');

  -- Skip overdraft-internal events to prevent loops
  IF v_source IN ('OVERDRAFT_DRAW', 'OVERDRAFT_FEE', 'OVERDRAFT_RECOVERY') THEN
    RETURN NEW;
  END IF;
  IF NEW.metadata->>'type' IN ('overdraft_draw', 'overdraft_fee', 'overdraft_recovery') THEN
    RETURN NEW;
  END IF;

  -- Apply recovery if applicable (best-effort, swallow errors)
  BEGIN
    PERFORM public.apply_overdraft_recovery(NEW.user_id, NEW.amount, NEW.id, v_source);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'overdraft recovery failed for ledger % : %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_overdraft_recovery ON public.ledger_entries;
CREATE TRIGGER trg_ledger_overdraft_recovery
AFTER INSERT ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.trigger_overdraft_recovery();