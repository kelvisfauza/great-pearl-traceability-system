ALTER TABLE public.store_clearance_forms
  ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.buyer_contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_store_clearance_forms_contract_id ON public.store_clearance_forms(contract_id);