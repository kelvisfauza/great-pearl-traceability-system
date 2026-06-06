CREATE OR REPLACE FUNCTION public.apply_overdraft_recovery(p_user_id uuid, p_credit_amount numeric, p_ledger_id uuid, p_source text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account RECORD;
  v_recover NUMERIC;
  v_new_outstanding NUMERIC;
BEGIN
  SELECT * INTO v_account
  FROM public.overdraft_accounts
  WHERE user_id = p_user_id
    AND status = 'active'
    AND outstanding_balance > 0
  FOR UPDATE
  LIMIT 1;

  IF NOT FOUND THEN RETURN 0; END IF;

  v_recover := LEAST(p_credit_amount, v_account.outstanding_balance);
  v_new_outstanding := v_account.outstanding_balance - v_recover;

  UPDATE public.overdraft_accounts
  SET outstanding_balance = v_new_outstanding,
      total_recovered = total_recovered + v_recover,
      updated_at = now()
  WHERE id = v_account.id;

  INSERT INTO public.overdraft_transactions
    (account_id, user_id, transaction_type, amount, balance_after, ledger_entry_id, reference, metadata)
  VALUES
    (v_account.id, p_user_id, 'recovery', v_recover, v_new_outstanding, p_ledger_id,
     'AUTO-RECOVERY', jsonb_build_object('source', p_source, 'original_credit', p_credit_amount));

  INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, source_category)
  VALUES (
    p_user_id,
    'WITHDRAWAL',
    -v_recover,
    'OD-REC-' || gen_random_uuid()::text,
    jsonb_build_object(
      'type', 'overdraft_recovery',
      'overdraft_account_id', v_account.id,
      'recovered_from_ledger_id', p_ledger_id,
      'source', p_source,
      'bypass_treasury_check', true,
      'description', 'Overdraft auto-recovery from incoming credit'
    ),
    'OVERDRAFT_RECOVERY'
  );

  RETURN v_recover;
END;
$function$;