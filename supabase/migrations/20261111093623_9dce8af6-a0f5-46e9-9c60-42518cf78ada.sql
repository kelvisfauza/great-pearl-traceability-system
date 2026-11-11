CREATE OR REPLACE FUNCTION public.display_supplier_summary()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $function$
WITH normalized AS (
  SELECT initcap(lower(coalesce(nullif(trim(regexp_replace(supplier_name, '\s*\((SUP[0-9]+|GPC\s*[0-9]+)\)\s*$', '', 'i')), ''), 'Unknown'))) AS name,
         coalesce(kilograms, 0)::numeric AS kgs
  FROM public.coffee_records
), ranked AS (
  SELECT name, round(sum(kgs)) AS kgs FROM normalized GROUP BY name ORDER BY sum(kgs) DESC, name LIMIT 8
)
SELECT jsonb_build_object(
  'topSuppliers', coalesce((SELECT jsonb_agg(jsonb_build_object('name', name, 'kgs', kgs) ORDER BY kgs DESC, name) FROM ranked), '[]'::jsonb),
  'totalKgs', coalesce((SELECT round(sum(kgs)) FROM normalized), 0)
);
$function$;
REVOKE ALL ON FUNCTION public.display_supplier_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.display_supplier_summary() TO authenticated, service_role;