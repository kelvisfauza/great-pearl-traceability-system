-- Remove unique constraint to allow multiple reports per day (max 2)
ALTER TABLE public.employee_daily_reports DROP CONSTRAINT IF EXISTS employee_daily_reports_employee_id_report_date_key;

-- Add a report_number column to track which report it is for the day
ALTER TABLE public.employee_daily_reports 
ADD COLUMN IF NOT EXISTS report_number INTEGER DEFAULT 1;