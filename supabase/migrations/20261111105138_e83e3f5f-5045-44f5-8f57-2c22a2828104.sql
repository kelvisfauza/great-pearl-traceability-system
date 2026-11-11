CREATE TABLE public.display_tv_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  speed numeric NOT NULL DEFAULT 1.5,
  ticker_items text[] NOT NULL DEFAULT '{}',
  custom_slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  hidden_slides text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
GRANT SELECT ON public.display_tv_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.display_tv_settings TO authenticated;
GRANT ALL ON public.display_tv_settings TO service_role;
ALTER TABLE public.display_tv_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read display settings" ON public.display_tv_settings FOR SELECT USING (true);
CREATE POLICY "Admins insert display settings" ON public.display_tv_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'Administrator') OR public.is_super_admin(auth.uid()));
CREATE POLICY "Admins update display settings" ON public.display_tv_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'Administrator') OR public.is_super_admin(auth.uid())) WITH CHECK (public.has_role(auth.uid(),'Administrator') OR public.is_super_admin(auth.uid()));
INSERT INTO public.display_tv_settings (id) VALUES (1);