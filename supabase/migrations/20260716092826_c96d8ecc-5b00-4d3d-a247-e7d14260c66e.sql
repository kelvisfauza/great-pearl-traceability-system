
DROP POLICY IF EXISTS "Super admins can read maintenance row" ON public.system_maintenance;
DROP POLICY IF EXISTS "Super admins can update maintenance status" ON public.system_maintenance;

CREATE POLICY "Admins can read maintenance row"
ON public.system_maintenance FOR SELECT
USING (
  has_role(auth.uid(), 'Super Admin'::app_role)
  OR has_role(auth.uid(), 'Administrator'::app_role)
);

CREATE POLICY "Admins can update maintenance status"
ON public.system_maintenance FOR UPDATE
USING (
  has_role(auth.uid(), 'Super Admin'::app_role)
  OR has_role(auth.uid(), 'Administrator'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'Super Admin'::app_role)
  OR has_role(auth.uid(), 'Administrator'::app_role)
);
