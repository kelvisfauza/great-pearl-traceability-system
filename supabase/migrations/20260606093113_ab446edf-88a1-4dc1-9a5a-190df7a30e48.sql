-- Stop the auto-recovery trigger from running on every incoming credit.
-- Overdraft outstanding will only be reduced via explicit repayments going forward.
DROP TRIGGER IF EXISTS trg_overdraft_recovery_on_credit ON public.ledger_entries;