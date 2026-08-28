CREATE TABLE IF NOT EXISTS public.grn_print_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL,
  batch_number text,
  printed_by_email text,
  printed_by_name text,
  print_count integer NOT NULL DEFAULT 1,
  first_printed_at timestamptz NOT NULL DEFAULT now(),
  last_printed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lot_id)
);

GRANT SELECT, INSERT, UPDATE ON public.grn_print_log TO authenticated;
GRANT ALL ON public.grn_print_log TO service_role;

ALTER TABLE public.grn_print_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read grn print log"
  ON public.grn_print_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can record grn prints"
  ON public.grn_print_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update grn prints"
  ON public.grn_print_log FOR UPDATE TO authenticated USING (true) WITH CHECK (true);