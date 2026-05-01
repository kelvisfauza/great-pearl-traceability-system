CREATE TABLE IF NOT EXISTS public.supplier_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT,
  amount_ugx NUMERIC NOT NULL CHECK (amount_ugx >= 0),
  outstanding_ugx NUMERIC NOT NULL CHECK (outstanding_ugx >= 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by TEXT,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_expenses_supplier ON public.supplier_expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_expenses_open ON public.supplier_expenses(supplier_id) WHERE is_closed = false;

ALTER TABLE public.supplier_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view supplier expenses"
  ON public.supplier_expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Finance/Admin can insert supplier expenses"
  ON public.supplier_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    OR public.has_role(auth.uid(), 'finance_assistant'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
  );

CREATE POLICY "Finance/Admin can update supplier expenses"
  ON public.supplier_expenses FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    OR public.has_role(auth.uid(), 'finance_assistant'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
  );

CREATE POLICY "Finance/Admin can delete supplier expenses"
  ON public.supplier_expenses FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  );

CREATE TRIGGER trg_supplier_expenses_updated_at
  BEFORE UPDATE ON public.supplier_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();