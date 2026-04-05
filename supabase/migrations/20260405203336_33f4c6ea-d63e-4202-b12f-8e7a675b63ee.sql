ALTER TABLE eudr_dispatch_reports 
ADD COLUMN weighbridge_tickets JSONB DEFAULT '[]'::jsonb;