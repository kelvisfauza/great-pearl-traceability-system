CREATE OR REPLACE FUNCTION quality_postings_private.supplier_names_similar(a text, b text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  WITH n AS (SELECT regexp_replace(lower(coalesce(a,'')),'[^a-z ]',' ','g') x, regexp_replace(lower(coalesce(b,'')),'[^a-z ]',' ','g') y),
  ta AS (SELECT t FROM n, regexp_split_to_table(n.x,'\s+') t WHERE length(t)>=4),
  tb AS (SELECT t FROM n, regexp_split_to_table(n.y,'\s+') t WHERE length(t)>=4)
  SELECT CASE WHEN btrim(x)='' OR btrim(y)='' THEN false
    WHEN replace(x,' ','')=replace(y,' ','') THEN true
    WHEN position(replace(x,' ','') in replace(y,' ',''))>0 OR position(replace(y,' ','') in replace(x,' ',''))>0 THEN true
    ELSE EXISTS (SELECT 1 FROM ta, tb WHERE ta.t=tb.t OR (length(regexp_replace(ta.t,'[aeiouy]','','g'))>=3 AND regexp_replace(ta.t,'[aeiouy]','','g')=regexp_replace(tb.t,'[aeiouy]','','g')))
  END FROM n;
$$;

CREATE OR REPLACE FUNCTION quality_postings_private.quality_posting_candidates(p_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE p public.quality_analysis_postings; d date; BEGIN IF NOT public.can_view_quality_postings() THEN RAISE EXCEPTION 'Quality access required'; END IF; SELECT * INTO p FROM public.quality_analysis_postings WHERE id=p_id; IF NOT FOUND THEN RAISE EXCEPTION 'Posting not found'; END IF; BEGIN d:=p.analysis_date::date; EXCEPTION WHEN OTHERS THEN d:=NULL; END; d:=coalesce(d,(p.received_at AT TIME ZONE 'Africa/Kampala')::date);
RETURN jsonb_build_object('orders',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT o.id,o.order_number,o.supplier_name,o.delivery_time,o.linked_store_record_id,o.linked_batch_number,CASE WHEN nullif(p.sampling_order_number,'') IS NOT NULL AND lower(trim(o.order_number))=lower(trim(p.sampling_order_number)) THEN 'Exact sampling order' WHEN nullif(p.batch_number,'') IS NOT NULL AND o.linked_batch_number=p.batch_number THEN 'Exact batch' WHEN lower(trim(o.supplier_name))=lower(trim(p.supplier_name)) THEN 'Supplier and date — confirm' ELSE 'Similar supplier name — confirm' END AS reason FROM public.quality_sampling_orders o WHERE (nullif(p.sampling_order_number,'') IS NOT NULL AND lower(trim(o.order_number))=lower(trim(p.sampling_order_number))) OR (nullif(p.batch_number,'') IS NOT NULL AND o.linked_batch_number=p.batch_number) OR (nullif(trim(p.supplier_name),'') IS NOT NULL AND abs((o.delivery_time AT TIME ZONE 'Africa/Kampala')::date-d)<=3 AND quality_postings_private.supplier_names_similar(o.supplier_name,p.supplier_name)) ORDER BY o.delivery_time DESC LIMIT 50) t),'[]'::jsonb),
'deliveries',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM (
  SELECT * FROM (SELECT c.id,c.batch_number,c.supplier_name,c.date,c.kilograms,'Exact batch'::text AS reason, 0 AS rk, c.created_at FROM public.coffee_records c WHERE nullif(p.batch_number,'') IS NOT NULL AND c.batch_number=p.batch_number LIMIT 10) a
  UNION ALL
  SELECT * FROM (SELECT c.id,c.batch_number,c.supplier_name,c.date,c.kilograms,
      CASE WHEN lower(trim(c.supplier_name))=lower(trim(p.supplier_name)) THEN 'Recent unlinked delivery from supplier' ELSE 'Similar supplier name in Store — confirm' END::text,
      CASE WHEN lower(trim(c.supplier_name))=lower(trim(p.supplier_name)) THEN 1 ELSE 2 END, c.created_at FROM public.coffee_records c
    WHERE nullif(trim(p.supplier_name),'') IS NOT NULL AND c.date >= coalesce(d,current_date) - 60
      AND quality_postings_private.supplier_names_similar(c.supplier_name,p.supplier_name)
      AND (nullif(p.batch_number,'') IS NULL OR c.batch_number IS DISTINCT FROM p.batch_number)
      AND NOT EXISTS (SELECT 1 FROM public.quality_analysis_postings q WHERE q.linked_delivery_id=c.id AND q.id<>p.id)
    ORDER BY (lower(trim(c.supplier_name))=lower(trim(p.supplier_name))) DESC, c.date DESC, c.created_at DESC LIMIT 3) b
  ORDER BY rk, date DESC, created_at DESC) t),'[]'::jsonb)); END; $function$;