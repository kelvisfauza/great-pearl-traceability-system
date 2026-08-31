ALTER TABLE public.dispatch_monitoring_forms
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS driver_phone text,
  ADD COLUMN IF NOT EXISTS driver_id_number text,
  ADD COLUMN IF NOT EXISTS transporter text,
  ADD COLUMN IF NOT EXISTS truck_serial_number text,
  ADD COLUMN IF NOT EXISTS container_number text,
  ADD COLUMN IF NOT EXISTS seal_numbers text,
  ADD COLUMN IF NOT EXISTS bags_loaded integer,
  ADD COLUMN IF NOT EXISTS gross_weight numeric,
  ADD COLUMN IF NOT EXISTS tare_weight numeric,
  ADD COLUMN IF NOT EXISTS net_weight numeric,
  ADD COLUMN IF NOT EXISTS dispatch_time text,
  ADD COLUMN IF NOT EXISTS batch_references text,
  ADD COLUMN IF NOT EXISTS dispatched_by text;

ALTER TABLE public.quality_dispatch_analyses
  ADD COLUMN IF NOT EXISTS dispatch_form_id uuid REFERENCES public.dispatch_monitoring_forms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qda_dispatch_form_id ON public.quality_dispatch_analyses(dispatch_form_id);