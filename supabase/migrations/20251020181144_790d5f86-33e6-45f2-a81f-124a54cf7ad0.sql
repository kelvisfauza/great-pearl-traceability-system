-- Drop the old check constraint
ALTER TABLE public.coffee_records DROP CONSTRAINT IF EXISTS coffee_records_status_check;

-- Add the new check constraint with 'submitted_to_finance' included
ALTER TABLE public.coffee_records ADD CONSTRAINT coffee_records_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'quality_review'::text, 'pricing'::text, 'batched'::text, 'drying'::text, 'sales'::text, 'inventory'::text, 'submitted_to_finance'::text]));