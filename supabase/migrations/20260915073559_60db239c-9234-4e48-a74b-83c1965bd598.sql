CREATE OR REPLACE FUNCTION public.block_reward_entries_when_suspended()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.entry_type IN ('LOYALTY_REWARD','MEETING_ATTENDANCE_BONUS','HOST_MEETING_BONUS')
     AND public.loyalty_awards_suspended() THEN
    RETURN NULL; -- silently skip while loyalty awards are suspended
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_reward_entries_when_suspended ON public.ledger_entries;
CREATE TRIGGER trg_block_reward_entries_when_suspended
BEFORE INSERT ON public.ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.block_reward_entries_when_suspended();