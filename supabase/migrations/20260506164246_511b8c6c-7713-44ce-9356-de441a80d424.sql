
ALTER TABLE public.system_maintenance ADD COLUMN IF NOT EXISTS expected_back_online timestamptz;

DROP FUNCTION IF EXISTS public.get_maintenance_status();

CREATE OR REPLACE FUNCTION public.get_maintenance_status()
RETURNS TABLE(is_active boolean, reason text, expected_back_online timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_active, reason, expected_back_online FROM public.system_maintenance LIMIT 1;
$$;
