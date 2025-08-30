-- Step 1: Drop the foreign key constraint
ALTER TABLE public.quality_assessments DROP CONSTRAINT IF EXISTS quality_assessments_store_record_id_fkey;

-- Step 2: Change coffee_records.id from UUID to TEXT
ALTER TABLE public.coffee_records ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.coffee_records ALTER COLUMN id SET DEFAULT '';

-- Step 3: Change quality_assessments.store_record_id from UUID to TEXT  
ALTER TABLE public.quality_assessments ALTER COLUMN store_record_id TYPE TEXT;