CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_created 
  ON public.ledger_entries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_type_created 
  ON public.ledger_entries (user_id, entry_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_entry_type 
  ON public.ledger_entries (entry_type);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at 
  ON public.ledger_entries (created_at DESC);

ANALYZE public.ledger_entries;