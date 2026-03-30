-- Employee Contracts tracking table
CREATE TABLE public.employee_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL,
  employee_name text NOT NULL,
  employee_email text NOT NULL,
  employee_gac_id text,
  contract_type text NOT NULL DEFAULT 'Fixed-Term',
  position text NOT NULL,
  department text NOT NULL,
  contract_start_date date NOT NULL,
  contract_end_date date,
  contract_duration_months integer,
  salary numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  renewal_count integer DEFAULT 0,
  renewed_from_id uuid REFERENCES public.employee_contracts(id),
  notes text,
  document_url text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.employee_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to employee_contracts"
ON public.employee_contracts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_employee_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_employee_contracts_updated_at
BEFORE UPDATE ON public.employee_contracts
FOR EACH ROW
EXECUTE FUNCTION update_employee_contracts_updated_at();