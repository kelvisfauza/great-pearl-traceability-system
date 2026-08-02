-- 1. Coffee types reference list
CREATE TABLE IF NOT EXISTS public.v3_coffee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'Arabica',
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.v3_coffee_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_coffee_types TO authenticated;
GRANT ALL ON public.v3_coffee_types TO service_role;

ALTER TABLE public.v3_coffee_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v3_coffee_types_read" ON public.v3_coffee_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "v3_coffee_types_manage" ON public.v3_coffee_types
  FOR ALL TO authenticated
  USING (public.has_v3_role(auth.uid(), 'v3_admin') OR public.has_v3_role(auth.uid(), 'quality_manager') OR public.has_v3_role(auth.uid(), 'trade_manager'))
  WITH CHECK (public.has_v3_role(auth.uid(), 'v3_admin') OR public.has_v3_role(auth.uid(), 'quality_manager') OR public.has_v3_role(auth.uid(), 'trade_manager'));

CREATE TRIGGER trg_v3_coffee_types_updated BEFORE UPDATE ON public.v3_coffee_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.v3_coffee_types (name, category, description) VALUES
  ('Arabica Parchment', 'Arabica', 'Washed arabica parchment'),
  ('Arabica Natural (Drugar)', 'Arabica', 'Sun dried natural arabica'),
  ('Arabica Screen 18', 'Arabica', 'Processed export grade'),
  ('Arabica Screen 17', 'Arabica', 'Processed export grade'),
  ('Arabica Screen 15', 'Arabica', 'Processed export grade'),
  ('Robusta FAQ', 'Robusta', 'Fair average quality robusta kiboko/clean'),
  ('Robusta Screen 18', 'Robusta', 'Processed export grade'),
  ('Robusta Screen 15', 'Robusta', 'Processed export grade'),
  ('Robusta Kiboko', 'Robusta', 'Unhulled robusta cherry'),
  ('Mixed Lot', 'Mixed', 'Mixed / unclassified delivery')
ON CONFLICT (name) DO NOTHING;

-- 2. Default branch so deliveries can be captured
INSERT INTO public.v3_branches (code, name, active)
SELECT 'HO', 'Head Office', true
WHERE NOT EXISTS (SELECT 1 FROM public.v3_branches WHERE code = 'HO');

-- 3. Import existing suppliers into the V3 registry (same ids so records stay linked)
INSERT INTO public.v3_suppliers (id, code, name, phone, district, bank_details, active)
SELECT s.id,
       COALESCE(NULLIF(s.code, ''), 'SUP-' || left(s.id::text, 6)),
       s.name,
       s.phone,
       s.origin,
       jsonb_strip_nulls(jsonb_build_object('bank_name', s.bank_name, 'account_name', s.account_name, 'account_number', s.account_number)),
       true
FROM public.suppliers s
ON CONFLICT (id) DO NOTHING;

-- 4. Keep them in sync going forward
CREATE OR REPLACE FUNCTION public.sync_supplier_to_v3()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.v3_suppliers (id, code, name, phone, district, bank_details, active)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.code, ''), 'SUP-' || left(NEW.id::text, 6)),
    NEW.name,
    NEW.phone,
    NEW.origin,
    jsonb_strip_nulls(jsonb_build_object('bank_name', NEW.bank_name, 'account_name', NEW.account_name, 'account_number', NEW.account_number)),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    district = EXCLUDED.district,
    bank_details = EXCLUDED.bank_details,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_supplier_to_v3 ON public.suppliers;
CREATE TRIGGER trg_sync_supplier_to_v3
AFTER INSERT OR UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.sync_supplier_to_v3();