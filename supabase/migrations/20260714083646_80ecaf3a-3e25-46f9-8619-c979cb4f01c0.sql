CREATE OR REPLACE FUNCTION public.normalize_ledger_withdrawal_sign()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF UPPER(COALESCE(NEW.entry_type, '')) = 'WITHDRAWAL' AND COALESCE(NEW.amount, 0) > 0 THEN
    NEW.amount := -ABS(NEW.amount);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_ledger_withdrawal_sign ON public.ledger_entries;
CREATE TRIGGER trg_normalize_ledger_withdrawal_sign
BEFORE INSERT OR UPDATE OF entry_type, amount ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.normalize_ledger_withdrawal_sign();