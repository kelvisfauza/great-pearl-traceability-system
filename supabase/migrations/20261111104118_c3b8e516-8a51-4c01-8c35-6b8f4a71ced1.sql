CREATE OR REPLACE FUNCTION public.display_public_prices()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_jsonb(m) - 'id' - 'created_at' - 'updated_at' - 'price_type'
  FROM public.market_prices m WHERE m.price_type = 'reference_prices' LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.display_public_prices() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.display_public_prices() TO anon, authenticated, service_role;