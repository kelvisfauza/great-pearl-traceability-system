-- Table to link laptop scan sessions with phone scanning
CREATE TABLE weighbridge_scan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  report_context JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 minutes')
);

-- Table for scanned tickets linked to a session
CREATE TABLE weighbridge_scanned_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES weighbridge_scan_sessions(id) ON DELETE CASCADE,
  qr_data TEXT NOT NULL,
  photo_url TEXT,
  scanned_at TIMESTAMPTZ DEFAULT now()
);

-- Enable realtime for the scanned tickets table
ALTER PUBLICATION supabase_realtime ADD TABLE weighbridge_scanned_tickets;

-- RLS
ALTER TABLE weighbridge_scan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weighbridge_scanned_tickets ENABLE ROW LEVEL SECURITY;

-- Allow anyone with anon key to read/write (phone won't be authenticated)
CREATE POLICY "Anyone can read sessions" ON weighbridge_scan_sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated can create sessions" ON weighbridge_scan_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON weighbridge_scan_sessions FOR UPDATE USING (true);

CREATE POLICY "Anyone can read tickets" ON weighbridge_scanned_tickets FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tickets" ON weighbridge_scanned_tickets FOR INSERT WITH CHECK (true);