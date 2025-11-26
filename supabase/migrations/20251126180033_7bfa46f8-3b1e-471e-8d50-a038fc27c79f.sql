
-- Simplify quality assessments RLS policies to use user_has_permission function
DROP POLICY IF EXISTS "Quality team can insert assessments" ON public.quality_assessments;
DROP POLICY IF EXISTS "Quality team can update assessments" ON public.quality_assessments;

-- Create INSERT policy using user_has_permission function
CREATE POLICY "Quality team can insert assessments"
ON public.quality_assessments
FOR INSERT
TO public
WITH CHECK (
  user_has_permission('Quality Control:create') 
  OR user_has_permission('Quality Control')
  OR is_current_user_admin()
);

-- Create UPDATE policy using user_has_permission function
CREATE POLICY "Quality team can update assessments"
ON public.quality_assessments
FOR UPDATE
TO public
USING (
  user_has_permission('Quality Control:edit')
  OR user_has_permission('Quality Control')
  OR is_current_user_admin()
)
WITH CHECK (
  user_has_permission('Quality Control:edit')
  OR user_has_permission('Quality Control')
  OR is_current_user_admin()
);
