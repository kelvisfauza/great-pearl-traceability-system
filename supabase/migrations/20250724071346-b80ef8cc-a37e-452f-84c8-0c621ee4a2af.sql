
-- Create supplier_contracts table for Firebase-like structure
CREATE TABLE IF NOT EXISTS public.supplier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  supplier_id UUID,
  contract_type TEXT NOT NULL,
  date DATE NOT NULL,
  kilograms_expected NUMERIC NOT NULL,
  price_per_kg NUMERIC NOT NULL,
  advance_given NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  voided_at TIMESTAMP WITH TIME ZONE,
  voided_by TEXT,
  void_reason TEXT,
  approval_status TEXT DEFAULT 'approved',
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_contracts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view supplier contracts" ON public.supplier_contracts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert supplier contracts" ON public.supplier_contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update supplier contracts" ON public.supplier_contracts FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete supplier contracts" ON public.supplier_contracts FOR DELETE USING (true);

-- Create contract_approvals table for approval workflow
CREATE TABLE IF NOT EXISTS public.contract_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.supplier_contracts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'void' or 'terminate'
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for contract_approvals
ALTER TABLE public.contract_approvals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contract_approvals
CREATE POLICY "Anyone can view contract approvals" ON public.contract_approvals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert contract approvals" ON public.contract_approvals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update contract approvals" ON public.contract_approvals FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete contract approvals" ON public.contract_approvals FOR DELETE USING (true);
