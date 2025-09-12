-- Add columns for delivery note and dispatch report documents
ALTER TABLE public.store_reports 
ADD COLUMN delivery_note_url TEXT,
ADD COLUMN delivery_note_name TEXT,
ADD COLUMN dispatch_report_url TEXT,
ADD COLUMN dispatch_report_name TEXT;