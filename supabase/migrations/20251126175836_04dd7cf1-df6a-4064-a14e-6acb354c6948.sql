
-- Fix quality assessments RLS policies to use granular permissions
DROP POLICY IF EXISTS "Quality team can insert assessments" ON public.quality_assessments;
DROP POLICY IF EXISTS "Quality team can update assessments" ON public.quality_assessments;

-- Create INSERT policy checking for Quality Control:create permission
CREATE POLICY "Quality team can insert assessments"
ON public.quality_assessments
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.auth_user_id = auth.uid()
    AND (
      'Quality Control:create' = ANY(employees.permissions)
      OR 'Quality Control' = ANY(employees.permissions)
    )
  )
  OR is_current_user_admin()
);

-- Create UPDATE policy checking for Quality Control:edit permission
CREATE POLICY "Quality team can update assessments"
ON public.quality_assessments
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.auth_user_id = auth.uid()
    AND (
      'Quality Control:edit' = ANY(employees.permissions)
      OR 'Quality Control' = ANY(employees.permissions)
    )
  )
  OR is_current_user_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.auth_user_id = auth.uid()
    AND (
      'Quality Control:edit' = ANY(employees.permissions)
      OR 'Quality Control' = ANY(employees.permissions)
    )
  )
  OR is_current_user_admin()
);
