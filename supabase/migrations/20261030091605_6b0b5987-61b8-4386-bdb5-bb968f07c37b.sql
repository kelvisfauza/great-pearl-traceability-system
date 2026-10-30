CREATE TABLE public.store_weighing_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE,
  buyer_name text NOT NULL,
  coffee_type text NOT NULL,
  bags integer NOT NULL DEFAULT 0,
  gross_weight_kg numeric NOT NULL,
  tare_weight_kg numeric NOT NULL DEFAULT 0,
  net_weight_kg numeric GENERATED ALWAYS AS (gross_weight_kg - tare_weight_kg) STORED,
  vehicle_registration text,
  driver_name text,
  released_by text NOT NULL,
  approved_by text,
  clearance_form_id uuid REFERENCES public.store_clearance_forms(id) ON DELETE SET NULL,
  remarks text,
  weighed_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE SEQUENCE public.store_weighing_ticket_seq;
CREATE OR REPLACE FUNCTION public.prepare_store_weighing_ticket()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.ticket_number := 'WT-' || to_char(now() AT TIME ZONE 'Africa/Kampala','YYYY') || '-' || lpad(nextval('public.store_weighing_ticket_seq')::text, 6, '0');
    NEW.weighed_at := now();
  ELSE
    NEW.ticket_number := OLD.ticket_number;
    NEW.weighed_at := OLD.weighed_at;
    NEW.updated_at := now();
  END IF;
  IF NEW.gross_weight_kg <= 0 OR NEW.tare_weight_kg < 0 OR NEW.tare_weight_kg >= NEW.gross_weight_kg THEN
    RAISE EXCEPTION 'Gross weight must be above zero and greater than tare weight';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER prepare_store_weighing_ticket BEFORE INSERT OR UPDATE ON public.store_weighing_tickets FOR EACH ROW EXECUTE FUNCTION public.prepare_store_weighing_ticket();
GRANT SELECT, INSERT, UPDATE ON public.store_weighing_tickets TO authenticated;
GRANT ALL ON public.store_weighing_tickets TO service_role;
GRANT USAGE ON SEQUENCE public.store_weighing_ticket_seq TO authenticated;
ALTER TABLE public.store_weighing_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view weighing tickets" ON public.store_weighing_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff create weighing tickets" ON public.store_weighing_tickets FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creators update weighing tickets" ON public.store_weighing_tickets FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());