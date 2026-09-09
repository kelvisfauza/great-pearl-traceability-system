CREATE TABLE public.quality_sampling_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  delivery_time timestamptz NOT NULL,
  supplier_name text NOT NULL,
  sample_type text NOT NULL,
  sampled_by text NOT NULL,
  notes text,
  verification_code text,
  status text NOT NULL DEFAULT 'pending',
  created_by_email text NOT NULL,
  created_by_name text,
  assessed_by text,
  assessed_at timestamptz,
  printed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.quality_sampling_orders TO authenticated;
GRANT ALL ON public.quality_sampling_orders TO service_role;

ALTER TABLE public.quality_sampling_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view sampling orders"
ON public.quality_sampling_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Samplers can create sampling orders"
ON public.quality_sampling_orders FOR INSERT TO authenticated
WITH CHECK (
  lower(public.current_user_email()) IN (
    'onesmusrubambura@greatpearlcoffee.com',
    'sserunkumataufiq@greatpearlcoffee.com'
  )
  OR public.can_manage_users()
);

CREATE POLICY "Lab staff can update sampling orders"
ON public.quality_sampling_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_quality_sampling_orders_updated_at
BEFORE UPDATE ON public.quality_sampling_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();