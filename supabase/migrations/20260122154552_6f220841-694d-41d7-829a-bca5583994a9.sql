-- Add columns for storing suspension reason and timestamp
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS disabled_reason TEXT,
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP WITH TIME ZONE;