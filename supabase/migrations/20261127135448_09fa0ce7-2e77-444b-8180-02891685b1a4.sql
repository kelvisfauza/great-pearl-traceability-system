CREATE POLICY "Server only withdrawal request codes"
ON public.withdrawal_request_otps
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);