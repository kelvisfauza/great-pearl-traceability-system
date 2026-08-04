CREATE TABLE public.attendance_import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  uploaded_by TEXT NOT NULL,
  uploaded_by_id UUID,
  total_rows INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_import_batches TO authenticated;
GRANT ALL ON public.attendance_import_batches TO service_role;
ALTER TABLE public.attendance_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view import batches"
  ON public.attendance_import_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can create import batches"
  ON public.attendance_import_batches FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_employees());
CREATE POLICY "Managers can update import batches"
  ON public.attendance_import_batches FOR UPDATE TO authenticated
  USING (public.can_manage_employees()) WITH CHECK (public.can_manage_employees());
CREATE POLICY "Managers can delete import batches"
  ON public.attendance_import_batches FOR DELETE TO authenticated
  USING (public.can_manage_employees());

CREATE TABLE public.attendance_import_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.attendance_import_batches(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT,
  device_user_id TEXT,
  device_name TEXT,
  record_date DATE NOT NULL,
  punches TEXT,
  arrival_time TIME,
  departure_time TIME,
  attendance_status TEXT NOT NULL DEFAULT 'present',
  assumed_arrival BOOLEAN NOT NULL DEFAULT false,
  assumed_departure BOOLEAN NOT NULL DEFAULT false,
  existing_arrival TIME,
  existing_departure TIME,
  existing_status TEXT,
  has_existing BOOLEAN NOT NULL DEFAULT false,
  edited BOOLEAN NOT NULL DEFAULT false,
  row_status TEXT NOT NULL DEFAULT 'pending',
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_import_rows_batch ON public.attendance_import_rows(batch_id);
CREATE INDEX idx_attendance_import_rows_status ON public.attendance_import_rows(row_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_import_rows TO authenticated;
GRANT ALL ON public.attendance_import_rows TO service_role;
ALTER TABLE public.attendance_import_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view import rows"
  ON public.attendance_import_rows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can create import rows"
  ON public.attendance_import_rows FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_employees());
CREATE POLICY "Managers can update import rows"
  ON public.attendance_import_rows FOR UPDATE TO authenticated
  USING (public.can_manage_employees()) WITH CHECK (public.can_manage_employees());
CREATE POLICY "Managers can delete import rows"
  ON public.attendance_import_rows FOR DELETE TO authenticated
  USING (public.can_manage_employees());

CREATE TRIGGER trg_attendance_import_batches_updated_at
  BEFORE UPDATE ON public.attendance_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_attendance_import_rows_updated_at
  BEFORE UPDATE ON public.attendance_import_rows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();