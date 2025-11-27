
-- Create a dedicated helper function for quality assessment RLS checks
CREATE OR REPLACE FUNCTION public.can_manage_quality_assessments()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees 
    WHERE employees.auth_user_id = auth.uid()
    AND employees.status = 'Active'
    AND (
      employees.role = 'Super Admin'
      OR employees.role = 'Administrator'
      OR 'Quality Control:create' = ANY(employees.permissions)
      OR 'Quality Control:edit' = ANY(employees.permissions)
      OR 'Quality Control' = ANY(employees.permissions)
    )
  );
END;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Quality team can insert assessments" ON public.quality_assessments;
DROP POLICY IF EXISTS "Quality team can update assessments" ON public.quality_assessments;

-- Recreate policies using the helper function
CREATE POLICY "Quality team can insert assessments"
ON public.quality_assessments
FOR INSERT
TO public
WITH CHECK (can_manage_quality_assessments());

CREATE POLICY "Quality team can update assessments"
ON public.quality_assessments
FOR UPDATE
TO public
USING (can_manage_quality_assessments())
WITH CHECK (can_manage_quality_assessments());
