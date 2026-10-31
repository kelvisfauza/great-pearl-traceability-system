CREATE OR REPLACE FUNCTION public.gosentepay_balance_adjust(p_delta numeric, p_type text, p_reference text, p_notes text, p_by text DEFAULT 'system')
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row gosentepay_balance%ROWTYPE; v_new numeric;
BEGIN
  IF p_reference IS NOT NULL AND EXISTS (SELECT 1 FROM gosentepay_balance_log WHERE reference = p_reference AND change_type = p_type) THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_row FROM gosentepay_balance ORDER BY updated_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_new := v_row.balance + p_delta;
  UPDATE gosentepay_balance SET balance = v_new, last_transaction_ref = p_reference, last_transaction_type = p_type,
    last_updated_by = p_by, updated_at = now() WHERE id = v_row.id;
  INSERT INTO gosentepay_balance_log(previous_balance, new_balance, change_amount, change_type, reference, notes, created_by)
  VALUES (v_row.balance, v_new, p_delta, p_type, p_reference, p_notes, p_by);
  RETURN v_new;
END $$;
REVOKE ALL ON FUNCTION public.gosentepay_balance_adjust(numeric,text,text,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_gosente_deposit_increase() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    IF TG_TABLE_NAME = 'mobile_money_transactions' THEN
      IF NEW.provider = 'gosentepay' AND NEW.transaction_type = 'deposit' THEN
        PERFORM gosentepay_balance_adjust(NEW.amount, 'deposit_credit', NEW.transaction_ref, 'Wallet deposit via GosentePay', 'system');
      END IF;
    ELSIF NEW.provider IN ('gosente','gosentepay') THEN
      PERFORM gosentepay_balance_adjust(NEW.amount, 'deposit_credit', NEW.reference, 'Treasury deposit via GosentePay', 'system');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS gosente_deposit_increase ON public.mobile_money_transactions;
CREATE TRIGGER gosente_deposit_increase AFTER INSERT OR UPDATE OF status ON public.mobile_money_transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_gosente_deposit_increase();
DROP TRIGGER IF EXISTS gosente_deposit_increase ON public.treasury_momo_deposits;
CREATE TRIGGER gosente_deposit_increase AFTER INSERT OR UPDATE OF status ON public.treasury_momo_deposits
FOR EACH ROW EXECUTE FUNCTION public.trg_gosente_deposit_increase();

-- Sync to the real GosentePay wallet balance reported on 31 Oct 2026 19:50
DO $$ DECLARE v_cur numeric; BEGIN
  SELECT balance INTO v_cur FROM gosentepay_balance ORDER BY updated_at DESC LIMIT 1;
  PERFORM gosentepay_balance_adjust(19548 - v_cur, 'provider_sync_fees', 'GSP-SYNC-20261031',
    'Synced to GosentePay reported wallet balance UGX 19,548 (email 31 Oct 19:50). Difference = unrecorded provider service fees and untracked movements since 11 Sep.', 'Fauza Kelvis');
END $$;