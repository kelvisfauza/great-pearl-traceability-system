
-- Single-row table to track maintenance mode
CREATE TABLE public.system_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active BOOLEAN NOT NULL DEFAULT false,
  activated_by TEXT,
  activated_at TIMESTAMPTZ,
  reason TEXT,
  recovery_key TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert the single config row
INSERT INTO public.system_maintenance (is_active) VALUES (false);

-- RLS
ALTER TABLE public.system_maintenance ENABLE ROW LEVEL SECURITY;

-- Everyone can read maintenance status (needed to show the page)
CREATE POLICY "Anyone can read maintenance status"
  ON public.system_maintenance FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update maintenance status"
  ON public.system_maintenance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE auth_user_id = auth.uid()
      AND role IN ('Administrator', 'Super Admin')
      AND status = 'Active'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_system_maintenance_updated_at
  BEFORE UPDATE ON public.system_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
