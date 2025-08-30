-- Update coffee_records table to use TEXT for ID instead of UUID to match Firebase IDs
ALTER TABLE public.coffee_records ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.coffee_records ALTER COLUMN id SET DEFAULT '';

-- Update quality_assessments to use TEXT for store_record_id to match
ALTER TABLE public.quality_assessments ALTER COLUMN store_record_id TYPE TEXT;