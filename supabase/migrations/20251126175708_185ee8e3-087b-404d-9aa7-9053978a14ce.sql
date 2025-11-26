-- Drop and recreate the quality assessments RLS policy with proper WITH CHECK clause
DROP POLICY IF EXISTS "Quality team can manage assessments" ON public.quality_assessments;

-- Create comprehensive policies for quality assessments
CREATE POLICY "Quality team can insert assessments"
ON public.quality_assessments
FOR INSERT
TO public
WITH CHECK (
  user_has_permission('Quality Control'::text) 
  OR is_current_user_admin()
);

CREATE POLICY "Quality team can update assessments"
ON public.quality_assessments
FOR UPDATE
TO public
USING (
  user_has_permission('Quality Control'::text) 
  OR is_current_user_admin()
)
WITH CHECK (
  user_has_permission('Quality Control'::text) 
  OR is_current_user_admin()
);

CREATE POLICY "Quality team can delete assessments"
ON public.quality_assessments
FOR DELETE
TO public
USING (
  is_current_user_admin()
);

-- Keep the existing view policy
-- (Quality team can view assessments policy already exists)