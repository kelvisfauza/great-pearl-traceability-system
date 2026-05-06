CREATE POLICY "Admins can view all investments"
ON public.investments
FOR SELECT
USING (
  public.has_role(auth.uid(), 'Administrator'::app_role)
  OR public.has_role(auth.uid(), 'Super Admin'::app_role)
);