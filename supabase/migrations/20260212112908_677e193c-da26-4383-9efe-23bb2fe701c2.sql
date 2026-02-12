ALTER TABLE public.coffee_records DROP CONSTRAINT coffee_records_status_check;

ALTER TABLE public.coffee_records ADD CONSTRAINT coffee_records_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'quality_review'::text, 'pricing'::text, 'batched'::text, 'drying'::text, 'sales'::text, 'inventory'::text, 'submitted_to_finance'::text, 'assessed'::text, 'rejected'::text, 'AWAITING_PRICING'::text, 'QUALITY_REJECTED'::text]));