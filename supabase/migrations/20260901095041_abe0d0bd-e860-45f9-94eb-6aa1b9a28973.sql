CREATE TABLE public.airtime_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month_year TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Monthly Airtime',
  status TEXT NOT NULL DEFAULT 'draft',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.airtime_batch_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.airtime_batches(id) ON DELETE CASCADE,
  employee_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  department TEXT,
  tier TEXT NOT NULL DEFAULT 'staff',
  amount NUMERIC NOT NULL DEFAULT 10000,
  included BOOLEAN NOT NULL DEFAULT true,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  yo_reference TEXT,
  error_message TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_airtime_batch_items_batch ON public.airtime_batch_items(batch_id);
CREATE INDEX idx_airtime_batch_items_email ON public.airtime_batch_items(employee_email);
CREATE UNIQUE INDEX idx_airtime_batch_items_unique ON public.airtime_batch_items(batch_id, employee_email);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.airtime_batches TO authenticated;
GRANT ALL ON public.airtime_batches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.airtime_batch_items TO authenticated;
GRANT ALL ON public.airtime_batch_items TO service_role;

ALTER TABLE public.airtime_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airtime_batch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage airtime batches"
ON public.airtime_batches FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'Administrator') OR public.has_role(auth.uid(), 'Super Admin'))
WITH CHECK (public.has_role(auth.uid(), 'Administrator') OR public.has_role(auth.uid(), 'Super Admin'));

CREATE POLICY "Admins manage airtime batch items"
ON public.airtime_batch_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'Administrator') OR public.has_role(auth.uid(), 'Super Admin'))
WITH CHECK (public.has_role(auth.uid(), 'Administrator') OR public.has_role(auth.uid(), 'Super Admin'));

CREATE POLICY "Employees view own airtime items"
ON public.airtime_batch_items FOR SELECT TO authenticated
USING (lower(employee_email) = lower(public.current_user_email()));

CREATE TRIGGER trg_airtime_batches_updated_at
BEFORE UPDATE ON public.airtime_batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_airtime_batch_items_updated_at
BEFORE UPDATE ON public.airtime_batch_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();