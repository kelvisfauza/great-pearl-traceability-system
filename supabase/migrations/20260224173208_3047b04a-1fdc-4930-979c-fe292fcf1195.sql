-- Allow anyone to deactivate maintenance (recovery key is verified in app code)
CREATE POLICY "Anyone can deactivate maintenance"
ON public.system_maintenance
FOR UPDATE
USING (is_active = true)
WITH CHECK (is_active = false);