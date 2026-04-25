CREATE TABLE public.ussd_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ussd_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ussd services"
ON public.ussd_services FOR SELECT USING (true);

CREATE POLICY "Admins insert ussd services"
ON public.ussd_services FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'Administrator'::app_role) OR public.has_role(auth.uid(), 'Super Admin'::app_role));

CREATE POLICY "Admins update ussd services"
ON public.ussd_services FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'Administrator'::app_role) OR public.has_role(auth.uid(), 'Super Admin'::app_role));

CREATE POLICY "Admins delete ussd services"
ON public.ussd_services FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'Administrator'::app_role) OR public.has_role(auth.uid(), 'Super Admin'::app_role));

CREATE TRIGGER trg_ussd_services_updated_at
BEFORE UPDATE ON public.ussd_services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ussd_services (service_key, name, display_order) VALUES
  ('1', 'Transport Recovery', 1),
  ('2', 'Pay Loaders', 2),
  ('3', 'Advance Recovery', 3);