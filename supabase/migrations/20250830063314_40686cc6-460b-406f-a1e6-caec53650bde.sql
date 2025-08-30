-- Add disabled field to employees table to control account access
ALTER TABLE public.employees ADD COLUMN disabled boolean DEFAULT false;

-- Add index for performance on disabled status
CREATE INDEX idx_employees_disabled ON public.employees(disabled);

-- Update existing employees to ensure they are not disabled by default
UPDATE public.employees SET disabled = false WHERE disabled IS NULL;