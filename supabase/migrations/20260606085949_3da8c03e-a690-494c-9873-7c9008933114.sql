DROP TRIGGER IF EXISTS trg_overdraft_recovery_on_credit ON public.ledger_entries;
CREATE TRIGGER trg_overdraft_recovery_on_credit
AFTER INSERT ON public.ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.trigger_overdraft_recovery();