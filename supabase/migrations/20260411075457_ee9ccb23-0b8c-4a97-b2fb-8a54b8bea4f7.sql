CREATE TABLE public.milling_momo_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  yo_reference TEXT,
  customer_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  initiated_by TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.milling_momo_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view milling momo transactions"
  ON public.milling_momo_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert milling momo transactions"
  ON public.milling_momo_transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Service role can update milling momo transactions"
  ON public.milling_momo_transactions FOR UPDATE USING (true);

CREATE INDEX idx_milling_momo_status ON public.milling_momo_transactions (status);
CREATE INDEX idx_milling_momo_customer ON public.milling_momo_transactions (customer_id);
CREATE INDEX idx_milling_momo_reference ON public.milling_momo_transactions (reference);