-- Marquee announcements: scrolling banners shown to all signed-in users
CREATE TABLE public.marquee_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'info' CHECK (priority IN ('info','warning','critical')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_name TEXT,
  created_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_marquee_active_expires ON public.marquee_announcements (is_active, expires_at);

ALTER TABLE public.marquee_announcements ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can read currently active announcements
CREATE POLICY "Authenticated users can read active marquee"
  ON public.marquee_announcements
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert marquee"
  ON public.marquee_announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_current_user_admin_by_role());

-- Only admins can update
CREATE POLICY "Admins can update marquee"
  ON public.marquee_announcements
  FOR UPDATE
  TO authenticated
  USING (public.is_current_user_admin_by_role());

-- Only admins can delete
CREATE POLICY "Admins can delete marquee"
  ON public.marquee_announcements
  FOR DELETE
  TO authenticated
  USING (public.is_current_user_admin_by_role());

-- Updated-at trigger
CREATE TRIGGER update_marquee_announcements_updated_at
  BEFORE UPDATE ON public.marquee_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.marquee_announcements;