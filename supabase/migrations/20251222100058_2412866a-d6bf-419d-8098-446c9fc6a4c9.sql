-- Keep christmas_vouchers.status in sync with claimed_at/completed_at

-- 1) Fix any already-claimed vouchers that are still marked as pending
UPDATE public.christmas_vouchers
SET status = 'claimed'
WHERE claimed_at IS NOT NULL
  AND coalesce(status, 'pending') = 'pending'
  AND completed_at IS NULL;

-- 2) Fix any completed vouchers that aren't marked completed
UPDATE public.christmas_vouchers
SET status = 'completed'
WHERE completed_at IS NOT NULL
  AND status <> 'completed';

-- 3) Add a trigger so this can never drift again
CREATE OR REPLACE FUNCTION public.sync_christmas_voucher_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL THEN
    NEW.status := 'completed';
  ELSIF NEW.claimed_at IS NOT NULL THEN
    NEW.status := 'claimed';
  ELSE
    NEW.status := 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_christmas_voucher_status ON public.christmas_vouchers;
CREATE TRIGGER trg_sync_christmas_voucher_status
BEFORE INSERT OR UPDATE ON public.christmas_vouchers
FOR EACH ROW
EXECUTE FUNCTION public.sync_christmas_voucher_status();
