-- Fix the status for already claimed vouchers
UPDATE public.christmas_vouchers 
SET status = 'claimed' 
WHERE claimed_at IS NOT NULL AND status = 'pending';

-- Add UPDATE policy for admins to complete vouchers
CREATE POLICY "Admins can update vouchers" 
ON public.christmas_vouchers 
FOR UPDATE
USING (EXISTS ( 
  SELECT 1 FROM employees 
  WHERE employees.email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text) 
  AND employees.role = ANY (ARRAY['Administrator'::text, 'Super Admin'::text])
))
WITH CHECK (EXISTS ( 
  SELECT 1 FROM employees 
  WHERE employees.email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text) 
  AND employees.role = ANY (ARRAY['Administrator'::text, 'Super Admin'::text])
));