-- Add created_by field to coffee_records to track who input the record
ALTER TABLE public.coffee_records 
ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.coffee_records.created_by IS 'Name of the user who created/input this coffee record';