-- Drop and recreate the generated columns with stricter rules:
--   * No overtime unless BOTH arrival_time and departure_time are present
--   * No late unless arrival_time is present
-- This is required because PostgreSQL does not allow ALTER COLUMN on a
-- generated column's expression.

ALTER TABLE public.attendance_time_records DROP COLUMN IF EXISTS is_late;
ALTER TABLE public.attendance_time_records DROP COLUMN IF EXISTS is_overtime;
ALTER TABLE public.attendance_time_records DROP COLUMN IF EXISTS late_minutes;
ALTER TABLE public.attendance_time_records DROP COLUMN IF EXISTS overtime_minutes;

ALTER TABLE public.attendance_time_records
  ADD COLUMN is_late boolean GENERATED ALWAYS AS (
    arrival_time IS NOT NULL AND arrival_time > '08:00:00'::time
  ) STORED;

ALTER TABLE public.attendance_time_records
  ADD COLUMN is_overtime boolean GENERATED ALWAYS AS (
    arrival_time IS NOT NULL
    AND departure_time IS NOT NULL
    AND departure_time > '17:00:00'::time
  ) STORED;

ALTER TABLE public.attendance_time_records
  ADD COLUMN late_minutes integer GENERATED ALWAYS AS (
    CASE
      WHEN arrival_time IS NOT NULL AND arrival_time > '08:00:00'::time
        THEN (EXTRACT(epoch FROM (arrival_time - '08:00:00'::time))::integer / 60)
      ELSE 0
    END
  ) STORED;

ALTER TABLE public.attendance_time_records
  ADD COLUMN overtime_minutes integer GENERATED ALWAYS AS (
    CASE
      WHEN arrival_time IS NOT NULL
        AND departure_time IS NOT NULL
        AND departure_time > '17:00:00'::time
        THEN (EXTRACT(epoch FROM (departure_time - '17:00:00'::time))::integer / 60)
      ELSE 0
    END
  ) STORED;