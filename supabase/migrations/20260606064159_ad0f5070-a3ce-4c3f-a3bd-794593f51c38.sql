
CREATE OR REPLACE FUNCTION public.consume_spendable(
  p_user_id uuid,
  p_amount numeric,
  p_source text,
  p_reference text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet numeric;
  v_acc RECORD;
  v_available numeric := 0;
  v_wallet_part numeric := 0;
  v_od_part numeric := 0;
  v_ledger_id uuid;
  v_od_ledger_id uuid;
  v_new_out numeric;
  v_ref text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Amount must be positive');
  END IF;

  v_ref := COALESCE(p_reference, p_source || '-' || gen_random_uuid()::text);
  v_wallet := COALESCE(public.get_wallet_balance(p_user_id), 0);

  SELECT * INTO v_acc FROM public.overdraft_accounts
   WHERE user_id = p_user_id AND status = 'active'
   FOR UPDATE LIMIT 1;
  IF FOUND AND NOT v_acc.frozen THEN
    v_available := GREATEST(0, v_acc.approved_limit - v_acc.outstanding_balance);
  END IF;

  IF p_amount > GREATEST(v_wallet, 0) + v_available THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient funds (wallet + overdraft)',
      'wallet', v_wallet, 'overdraft_available', v_available);
  END IF;

  v_wallet_part := LEAST(p_amount, GREATEST(v_wallet, 0));
  v_od_part := p_amount - v_wallet_part;

  -- 1) Wallet portion: only debit wallet for what the wallet actually covers
  IF v_wallet_part > 0 THEN
    INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, source_category)
    VALUES (
      p_user_id::text,
      'WITHDRAWAL',
      -v_wallet_part,
      v_ref,
      COALESCE(p_metadata,'{}'::jsonb)
        || jsonb_build_object('source', p_source, 'wallet_portion', v_wallet_part, 'overdraft_portion', v_od_part),
      p_source
    ) RETURNING id INTO v_ledger_id;
  END IF;

  -- 2) Overdraft portion: separate visible ledger entry tagged OVERDRAFT_DRAW
  IF v_od_part > 0 AND v_acc.id IS NOT NULL THEN
    INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, source_category)
    VALUES (
      p_user_id::text,
      'WITHDRAWAL',
      -v_od_part,
      v_ref || '-OD',
      COALESCE(p_metadata,'{}'::jsonb)
        || jsonb_build_object('source', p_source, 'type', 'overdraft_draw',
                              'overdraft_account_id', v_acc.id,
                              'description', 'Overdraft draw for ' || p_source),
      'OVERDRAFT_DRAW'
    ) RETURNING id INTO v_od_ledger_id;

    v_new_out := v_acc.outstanding_balance + v_od_part;
    UPDATE public.overdraft_accounts
       SET outstanding_balance = v_new_out,
           total_drawn = total_drawn + v_od_part,
           last_used_at = now(),
           updated_at = now()
     WHERE id = v_acc.id;

    INSERT INTO public.overdraft_transactions
      (account_id, user_id, transaction_type, amount, balance_after, ledger_entry_id, reference, metadata)
    VALUES
      (v_acc.id, p_user_id, 'draw', v_od_part, v_new_out, v_od_ledger_id, v_ref,
       jsonb_build_object('source', p_source, 'wallet_portion', v_wallet_part));
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'ledger_id', COALESCE(v_ledger_id, v_od_ledger_id),
    'overdraft_ledger_id', v_od_ledger_id,
    'wallet_portion', v_wallet_part,
    'overdraft_portion', v_od_part,
    'new_outstanding', COALESCE(v_new_out, v_acc.outstanding_balance, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_spendable(uuid, numeric, text, text, jsonb) TO service_role;
