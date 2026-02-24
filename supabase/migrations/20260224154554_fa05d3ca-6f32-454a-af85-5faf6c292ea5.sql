-- Change standard_end default from 17:00 to 17:30
ALTER TABLE public.attendance_time_records 
ALTER COLUMN standard_end SET DEFAULT '17:30:00'::time without time zone;