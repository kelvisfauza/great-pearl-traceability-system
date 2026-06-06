CREATE OR REPLACE FUNCTION public.sync_overdraft_recovery_from_wallet(
  p_user_id text,
  p_source_ledger_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_acc RECORD;
  v_wallet numeric := 0;
  v_old_out numeric := 0;
  v_new_out numeric := 0;
  v_recovery numeric := 0;
  v_old_interest numeric := 0;
  v_new_interest numeric := 0;
  v_ref text;
BEGIN
  IF p_user_id IS NULL
     OR p_user_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'non_uuid_user_id');
  END IF;

  v_uid := p_user_id::uuid;

  SELECT *
    INTO v_acc
    FROM public.overdraft_accounts
   WHERE user_id = v_uid
     AND status = 'active'
   FOR UPDATE
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'no_active_account');
  END IF;

  v_wallet := COALESCE(public.get_wallet_balance(v_uid), 0);
  v_old_out := COALESCE(v_acc.outstanding_balance, 0);
  v_old_interest := COALESCE(v_acc.total_interest, 0);

  v_new_out := LEAST(v_old_out, GREATEST(0, -v_wallet));
  v_recovery := GREATEST(0, v_old_out - v_new_out);

  IF v_recovery <= 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'account_id', v_acc.id,
      'wallet_balance', v_wallet,
      'old_outstanding', v_old_out,
      'new_outstanding', v_old_out,
      'recovered', 0
    );
  END IF;

  v_new_interest := LEAST(v_old_interest, v_new_out);
  v_ref := COALESCE('OD-WALLET-SYNC-' || p_source_ledger_id::text, 'OD-WALLET-SYNC-' || replace(gen_random_uuid()::text, '-', ''));

  UPDATE public.overdraft_accounts
     SET outstanding_balance = v_new_out,
         total_interest = v_new_interest,
         total_recovered = COALESCE(total_recovered, 0) + v_recovery,
         updated_at = now()
   WHERE id = v_acc.id;

  INSERT INTO public.overdraft_transactions (
    account_id,
    user_id,
    transaction_type,
    amount,
    balance_after,
    ledger_entry_id,
    reference,
    metadata
  ) VALUES (
    v_acc.id,
    v_uid,
    'recovery',
    v_recovery,
    v_new_out,
    p_source_ledger_id,
    v_ref,
    jsonb_build_object(
      'source', 'wallet_sync',
      'type', 'overdraft_recovery',
      'wallet_balance_after', v_wallet,
      'recovered_from_ledger_id', p_source_ledger_id,
      'description', 'Automatic overdraft sync from wallet recovery'
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'account_id', v_acc.id,
    'wallet_balance', v_wallet,
    'old_outstanding', v_old_out,
    'new_outstanding', v_new_out,
    'recovered', v_recovery
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_overdraft_recovery_from_wallet(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.trigger_sync_overdraft_recovery_from_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.amount > 0 THEN
    PERFORM public.sync_overdraft_recovery_from_wallet(NEW.user_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_overdraft_recovery_from_wallet ON public.ledger_entries;
CREATE TRIGGER trg_sync_overdraft_recovery_from_wallet
AFTER INSERT ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.trigger_sync_overdraft_recovery_from_wallet();