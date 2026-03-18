
-- Table to track sales allocated to buyer contracts
CREATE TABLE public.contract_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.buyer_contracts(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.sales_transactions(id) ON DELETE CASCADE,
  allocated_kg numeric NOT NULL CHECK (allocated_kg > 0),
  allocated_by text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_contract_allocations_contract ON public.contract_allocations(contract_id);
CREATE INDEX idx_contract_allocations_sale ON public.contract_allocations(sale_id);

-- Enable RLS
ALTER TABLE public.contract_allocations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Authenticated users can manage contract allocations"
  ON public.contract_allocations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
