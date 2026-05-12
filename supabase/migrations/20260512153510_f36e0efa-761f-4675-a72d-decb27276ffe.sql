
CREATE TABLE IF NOT EXISTS public.expense_template_refs (
  ref text PRIMARY KEY,
  template_type text NOT NULL,
  approval_type text NOT NULL,
  employee_email text,
  employee_name text,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  used_by text,
  request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_template_refs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone authenticated can insert their own ref"
  ON public.expense_template_refs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated can view all refs"
  ON public.expense_template_refs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated can mark refs used"
  ON public.expense_template_refs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_expense_template_refs_employee ON public.expense_template_refs(employee_email);
CREATE INDEX IF NOT EXISTS idx_expense_template_refs_type ON public.expense_template_refs(approval_type);
