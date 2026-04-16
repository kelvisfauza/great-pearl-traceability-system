
ALTER TABLE public.coffee_records 
ADD COLUMN IF NOT EXISTS grn_printed_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.coffee_records 
ADD COLUMN IF NOT EXISTS grn_printed_by TEXT DEFAULT NULL;
