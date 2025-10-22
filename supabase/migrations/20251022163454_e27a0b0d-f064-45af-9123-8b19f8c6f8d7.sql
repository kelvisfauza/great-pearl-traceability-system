-- Add locking fields to attendance table
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_by TEXT,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

-- Create function to lock attendance after marking
CREATE OR REPLACE FUNCTION lock_attendance_on_mark()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is being set (not null) and record is not already locked
  IF NEW.status IS NOT NULL AND (OLD.is_locked IS NULL OR OLD.is_locked = false) THEN
    NEW.is_locked := true;
    NEW.locked_by := NEW.marked_by;
    NEW.locked_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-lock on insert/update
DROP TRIGGER IF EXISTS lock_attendance_trigger ON public.attendance;
CREATE TRIGGER lock_attendance_trigger
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION lock_attendance_on_mark();

-- Update RLS policy to prevent editing locked records
DROP POLICY IF EXISTS "Admins can manage attendance" ON public.attendance;

CREATE POLICY "Admins can view all attendance"
ON public.attendance FOR SELECT
USING (true);

CREATE POLICY "Admins can insert attendance"
ON public.attendance FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update unlocked attendance only"
ON public.attendance FOR UPDATE
USING (is_locked = false OR is_locked IS NULL)
WITH CHECK (true);

CREATE POLICY "Only superadmins can delete attendance"
ON public.attendance FOR DELETE
USING (is_current_user_admin());