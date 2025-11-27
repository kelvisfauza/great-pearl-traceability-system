
-- Drop the existing policies that use user_has_permission function
DROP POLICY IF EXISTS "Quality team can insert assessments" ON public.quality_assessments;
DROP POLICY IF EXISTS "Quality team can update assessments" ON public.quality_assessments;

-- Create direct INSERT policy without function dependency
CREATE POLICY "Quality team can insert assessments"
ON public.quality_assessments
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE employees.auth_user_id = auth.uid()
    AND employees.status = 'Active'
    AND (
      employees.role = 'Super Admin'
      OR employees.role = 'Administrator'
      OR 'Quality Control:create' = ANY(employees.permissions)
      OR 'Quality Control' = ANY(employees.permissions)
    )
  )
);

-- Create direct UPDATE policy without function dependency
CREATE POLICY "Quality team can update assessments"
ON public.quality_assessments
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE employees.auth_user_id = auth.uid()
    AND employees.status = 'Active'
    AND (
      employees.role = 'Super Admin'
      OR employees.role = 'Administrator'
      OR 'Quality Control:edit' = ANY(employees.permissions)
      OR 'Quality Control' = ANY(employees.permissions)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE employees.auth_user_id = auth.uid()
    AND employees.status = 'Active'
    AND (
      employees.role = 'Super Admin'
      OR employees.role = 'Administrator'
      OR 'Quality Control:edit' = ANY(employees.permissions)
      OR 'Quality Control' = ANY(employees.permissions)
    )
  )
);
