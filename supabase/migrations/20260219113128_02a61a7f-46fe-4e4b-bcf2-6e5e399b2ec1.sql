
-- Attendance time tracking table for IT-managed clock-in/clock-out
CREATE TABLE public.attendance_time_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  arrival_time TIME,
  departure_time TIME,
  standard_start TIME NOT NULL DEFAULT '08:00:00',
  standard_end TIME NOT NULL DEFAULT '17:00:00',
  is_late BOOLEAN GENERATED ALWAYS AS (arrival_time > '08:00:00') STORED,
  is_overtime BOOLEAN GENERATED ALWAYS AS (departure_time > '17:00:00') STORED,
  late_minutes INTEGER GENERATED ALWAYS AS (
    CASE WHEN arrival_time > '08:00:00' 
      THEN EXTRACT(EPOCH FROM (arrival_time - '08:00:00'))::INTEGER / 60 
      ELSE 0 
    END
  ) STORED,
  overtime_minutes INTEGER GENERATED ALWAYS AS (
    CASE WHEN departure_time > '17:00:00' 
      THEN EXTRACT(EPOCH FROM (departure_time - '17:00:00'))::INTEGER / 60 
      ELSE 0 
    END
  ) STORED,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
  notes TEXT,
  recorded_by TEXT NOT NULL,
  support_document_url TEXT,
  support_document_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, record_date)
);

-- Enable RLS
ALTER TABLE public.attendance_time_records ENABLE ROW LEVEL SECURITY;

-- RLS policies - IT/Admin can manage
CREATE POLICY "IT and Admin can view attendance records"
  ON public.attendance_time_records FOR SELECT
  USING (
    public.user_has_permission('IT Management')
    OR public.is_current_user_administrator()
  );

CREATE POLICY "IT and Admin can insert attendance records"
  ON public.attendance_time_records FOR INSERT
  WITH CHECK (
    public.user_has_permission('IT Management')
    OR public.is_current_user_administrator()
  );

CREATE POLICY "IT and Admin can update attendance records"
  ON public.attendance_time_records FOR UPDATE
  USING (
    public.user_has_permission('IT Management')
    OR public.is_current_user_administrator()
  );

CREATE POLICY "IT and Admin can delete attendance records"
  ON public.attendance_time_records FOR DELETE
  USING (
    public.user_has_permission('IT Management')
    OR public.is_current_user_administrator()
  );

-- Trigger for updated_at
CREATE TRIGGER update_attendance_time_records_updated_at
  BEFORE UPDATE ON public.attendance_time_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for attendance machine documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-documents', 'attendance-documents', false);

-- Storage RLS policies
CREATE POLICY "IT/Admin can upload attendance docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'attendance-documents'
    AND (
      public.user_has_permission('IT Management')
      OR public.is_current_user_administrator()
    )
  );

CREATE POLICY "IT/Admin can view attendance docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'attendance-documents'
    AND (
      public.user_has_permission('IT Management')
      OR public.is_current_user_administrator()
    )
  );

CREATE POLICY "IT/Admin can delete attendance docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'attendance-documents'
    AND (
      public.user_has_permission('IT Management')
      OR public.is_current_user_administrator()
    )
  );
