CREATE TABLE IF NOT EXISTS public.batch_number_counters (
  date_prefix text PRIMARY KEY,
  last_seq integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.batch_number_counters TO authenticated;
GRANT ALL ON public.batch_number_counters TO service_role;

ALTER TABLE public.batch_number_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view batch counters"
ON public.batch_number_counters FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.next_batch_number(p_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text := to_char(p_date, 'YYYYMMDD');
  v_existing integer := 0;
  v_seq integer;
BEGIN
  -- Seed from any batch numbers already recorded for this day (legacy data)
  SELECT COALESCE(MAX(NULLIF(regexp_replace(substring(batch_number from 9), '\D', '', 'g'), '')::int), 0)
    INTO v_existing
  FROM (
    SELECT batch_number FROM public.coffee_records WHERE batch_number LIKE v_prefix || '%'
    UNION ALL
    SELECT batch_number FROM public.store_records WHERE batch_number LIKE v_prefix || '%'
  ) t;

  INSERT INTO public.batch_number_counters (date_prefix, last_seq)
  VALUES (v_prefix, GREATEST(v_existing, 0) + 1)
  ON CONFLICT (date_prefix) DO UPDATE
    SET last_seq = GREATEST(public.batch_number_counters.last_seq, EXCLUDED.last_seq - 1) + 1,
        updated_at = now()
  RETURNING last_seq INTO v_seq;

  RETURN v_prefix || lpad(v_seq::text, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_batch_number(date) TO authenticated, service_role;