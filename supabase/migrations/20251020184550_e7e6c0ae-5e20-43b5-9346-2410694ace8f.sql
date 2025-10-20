-- Remove the old quality_assessments_status_check constraint that doesn't include 'rejected'
ALTER TABLE public.quality_assessments DROP CONSTRAINT IF EXISTS quality_assessments_status_check;