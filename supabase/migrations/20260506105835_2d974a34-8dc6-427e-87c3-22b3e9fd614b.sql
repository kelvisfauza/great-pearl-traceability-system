
-- Allow anonymous phones to insert tickets for an active, unexpired session
DROP POLICY IF EXISTS "Anyone can insert tickets" ON public.weighbridge_scanned_tickets;

CREATE POLICY "Anon can insert tickets for active session"
ON public.weighbridge_scanned_tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.weighbridge_scan_sessions s
    WHERE s.id = session_id
      AND s.status = 'active'
      AND s.expires_at > now()
  )
);

-- Ensure anon can also read sessions (for validation on phone)
DROP POLICY IF EXISTS "Anyone can read sessions" ON public.weighbridge_scan_sessions;
CREATE POLICY "Anyone can read sessions"
ON public.weighbridge_scan_sessions
FOR SELECT
TO anon, authenticated
USING (true);
