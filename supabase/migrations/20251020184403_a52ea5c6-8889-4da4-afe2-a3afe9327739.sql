-- Update quality_assessments status constraint to include 'rejected'
ALTER TABLE public.quality_assessments DROP CONSTRAINT IF EXISTS quality_assessment_status_check;

ALTER TABLE public.quality_assessments ADD CONSTRAINT quality_assessment_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'assessed'::text, 'approved'::text, 'submitted_to_finance'::text, 'rejected'::text]));