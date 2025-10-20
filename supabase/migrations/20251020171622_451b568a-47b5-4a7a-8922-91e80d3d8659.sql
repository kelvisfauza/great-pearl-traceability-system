-- Add calculator result columns to quality_assessments table
ALTER TABLE public.quality_assessments
ADD COLUMN IF NOT EXISTS fm numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS clean_d14 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS outturn numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS outturn_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_note text,
ADD COLUMN IF NOT EXISTS reject_outturn_price boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reject_final boolean DEFAULT false;