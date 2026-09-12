UPDATE public.grn_payment_allocations a
SET status = 'paid',
    paid_at = COALESCE(a.paid_at, l.updated_at, now())
FROM public.finance_coffee_lots l
WHERE l.id = a.lot_id
  AND a.status = 'pending'
  AND upper(l.finance_status::text) = 'PAID';

CREATE OR REPLACE FUNCTION public.close_grn_allocation_on_lot_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF upper(COALESCE(NEW.finance_status::text,'')) = 'PAID'
     AND upper(COALESCE(OLD.finance_status::text,'')) <> 'PAID' THEN
    UPDATE public.grn_payment_allocations
    SET status = 'paid', paid_at = COALESCE(paid_at, now())
    WHERE lot_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_grn_allocation_on_lot_paid ON public.finance_coffee_lots;
CREATE TRIGGER trg_close_grn_allocation_on_lot_paid
AFTER UPDATE OF finance_status ON public.finance_coffee_lots
FOR EACH ROW EXECUTE FUNCTION public.close_grn_allocation_on_lot_paid();