
CREATE TABLE public.per_diem_awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT,
  awarded_by TEXT NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.per_diem_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view per diem awards"
ON public.per_diem_awards FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert per diem awards"
ON public.per_diem_awards FOR INSERT TO authenticated WITH CHECK (true);

CREATE TRIGGER update_per_diem_awards_updated_at
BEFORE UPDATE ON public.per_diem_awards
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
