-- Create supplier_subcontracts table for contracts between company and suppliers
CREATE TABLE public.supplier_subcontracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_ref VARCHAR(20) NOT NULL UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT NOT NULL,
  contract_size TEXT NOT NULL,
  delivery_station TEXT NOT NULL,
  net_weight NUMERIC NOT NULL,
  price_per_kg NUMERIC NOT NULL,
  price_subject_to_uprisal BOOLEAN DEFAULT false,
  cuttings TEXT,
  terms TEXT,
  outturn NUMERIC,
  moisture NUMERIC,
  total_fm NUMERIC,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT
);

-- Enable RLS
ALTER TABLE public.supplier_subcontracts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to view supplier subcontracts"
ON public.supplier_subcontracts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert supplier subcontracts"
ON public.supplier_subcontracts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update supplier subcontracts"
ON public.supplier_subcontracts FOR UPDATE
TO authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_supplier_subcontracts_updated_at
  BEFORE UPDATE ON public.supplier_subcontracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create sequence for contract reference number
CREATE SEQUENCE IF NOT EXISTS supplier_subcontract_seq START 1;