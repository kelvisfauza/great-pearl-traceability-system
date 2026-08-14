DO $$
DECLARE v_acc public.overdraft_accounts%ROWTYPE; v_draw numeric := 17787.212; v_fee numeric := 489; v_new numeric;
BEGIN
  SELECT * INTO v_acc FROM public.overdraft_accounts WHERE user_id = 'e400bc7b-be01-4654-b9b7-7f30334e87e8' AND status='active' LIMIT 1;
  IF NOT FOUND THEN RAISE NOTICE 'no account'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.overdraft_transactions WHERE reference = 'AWO-54b8b163-1786724868900-ODDRAW') THEN RETURN; END IF;
  v_new := COALESCE(v_acc.outstanding_balance,0) + v_draw + v_fee;
  UPDATE public.overdraft_accounts
    SET outstanding_balance = v_new,
        total_drawn = COALESCE(total_drawn,0) + v_draw,
        last_used_at = now(),
        first_negative_at = COALESCE(first_negative_at, now()),
        updated_at = now()
  WHERE id = v_acc.id;
  INSERT INTO public.overdraft_transactions (account_id, user_id, transaction_type, amount, balance_after, reference, metadata)
  VALUES
    (v_acc.id, v_acc.user_id, 'draw', v_draw, v_new, 'AWO-54b8b163-1786724868900-ODDRAW', '{"source":"admin_wallet_operation","backfill":true}'::jsonb),
    (v_acc.id, v_acc.user_id, 'fee', v_fee, v_new, 'AWO-54b8b163-1786724868900-ODFEE', '{"source":"admin_wallet_operation","backfill":true,"fee_rate":0.0275}'::jsonb);
END $$;