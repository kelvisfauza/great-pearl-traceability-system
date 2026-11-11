CREATE TABLE IF NOT EXISTS system_integrity_private.coffee_duplicate_marks(
  coffee_record_id text PRIMARY KEY, kept_record_id text, note text,
  marked_by uuid, marked_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS system_integrity_private.coffee_flag_dismissals(
  fingerprint text PRIMARY KEY, note text, dismissed_by uuid, dismissed_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON system_integrity_private.coffee_duplicate_marks, system_integrity_private.coffee_flag_dismissals FROM PUBLIC, anon, authenticated;

INSERT INTO system_integrity_private.coffee_duplicate_marks(coffee_record_id,kept_record_id,note)
VALUES ('20260901028','d243d782-3775-4e4d-97e8-1678ebd56bae','Cathy 114kg duplicate; second payment of 1,824,000 to recover') ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION system_integrity_private.quality_price_ok(p_price numeric, q public.quality_assessments)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_price IN (coalesce(q.final_price,-1),coalesce(q.admin_discretion_price,-1),coalesce(q.suggested_price,-1))
      OR coalesce(nullif(q.final_price,0),nullif(q.admin_discretion_price,0),nullif(q.suggested_price,0)) IS NULL $$;

CREATE OR REPLACE VIEW system_integrity_private.coffee_flag_candidates AS
WITH recs AS (
  SELECT cr.* FROM public.coffee_records cr
  WHERE cr.date >= DATE '2026-08-01' AND coalesce(cr.status,'') NOT IN ('rejected','QUALITY_REJECTED')
    AND NOT EXISTS (SELECT 1 FROM system_integrity_private.coffee_duplicate_marks m WHERE m.coffee_record_id=cr.id)
), dup AS (
  SELECT lower(btrim(supplier_name)) sup, date, kilograms, jsonb_agg(jsonb_build_object(
     'delivery_id', r.id, 'delivery_number', r.batch_number, 'recorded_at', r.created_at, 'recorded_by', r.created_by, 'status', r.status,
     'in_stock_batch', EXISTS(SELECT 1 FROM public.inventory_batch_sources s WHERE s.coffee_record_id=r.id),
     'quality_price', (SELECT coalesce(nullif(q.final_price,0),q.suggested_price) FROM public.quality_assessments q WHERE q.store_record_id=r.id LIMIT 1),
     'finance', (SELECT jsonb_agg(jsonb_build_object('lot_id',f.id,'price',f.unit_price_ugx,'total',f.total_amount_ugx,'status',f.finance_status,'notes',f.finance_notes)) FROM public.finance_coffee_lots f WHERE f.coffee_record_id::text=r.id)
   ) ORDER BY r.created_at) recs,
   min(r.supplier_name) supplier_name,
   (SELECT count(*) FROM public.finance_coffee_lots f WHERE f.coffee_record_id::text = ANY(array_agg(r.id)) AND f.finance_status='PAID') paid_count
  FROM recs r GROUP BY 1,2,3 HAVING count(*)>1
)
SELECT 'delivery_duplicate:'||sup||':'||date||':'||kilograms AS fingerprint, 'delivery_duplicate'::text rule_key, 'Store'::text department,
  CASE WHEN paid_count>1 THEN 'critical' ELSE 'high' END severity,
  CASE WHEN paid_count>1 THEN 'Possible double delivery entry, paid more than once' ELSE 'Possible double delivery entry' END title,
  jsonb_build_object('supplier',supplier_name,'date',date,'kilograms',kilograms,'records',recs,'paid_entries',paid_count,
    'action','Same supplier, day and weight were received more than once. If it is one load, mark the extra copy as a duplicate; if they are real separate loads, accept as correct.') details,
  '/store'::text review_path
FROM dup
UNION ALL
SELECT 'lot_price_mismatch:'||f.id, 'lot_price_mismatch', 'Finance', CASE WHEN f.finance_status='PAID' THEN 'critical' ELSE 'high' END,
  'Finance price differs from the quality price',
  jsonb_build_object('supplier',cr.supplier_name,'delivery_number',cr.batch_number,'date',cr.date,'kilograms',f.quantity_kg,'lot_id',f.id,
    'finance_price',f.unit_price_ugx,'quality_price',coalesce(nullif(q.final_price,0),nullif(q.admin_discretion_price,0),q.suggested_price),'finance_status',f.finance_status,
    'action','Set the Finance price to the quality price if unpaid; if already paid, record the difference and accept.'),
  '/finance'
FROM public.finance_coffee_lots f JOIN public.quality_assessments q ON q.id=f.quality_assessment_id
JOIN recs cr ON cr.id=f.coffee_record_id::text
WHERE NOT system_integrity_private.quality_price_ok(f.unit_price_ugx,q)
UNION ALL
SELECT 'lot_unassessed_extra:'||f.id, 'lot_unassessed_extra', 'Finance', 'high',
  'Extra Finance entry with no quality assessment',
  jsonb_build_object('supplier',cr.supplier_name,'delivery_number',cr.batch_number,'date',cr.date,'kilograms',f.quantity_kg,'lot_id',f.id,
    'finance_price',f.unit_price_ugx,'finance_status',f.finance_status,
    'quality_price',(SELECT coalesce(nullif(q.final_price,0),q.suggested_price) FROM public.quality_assessments q WHERE q.store_record_id=cr.id LIMIT 1),
    'action','This delivery already has an assessed Finance entry. Delete this leftover entry if unpaid.'),
  '/finance'
FROM public.finance_coffee_lots f JOIN recs cr ON cr.id=f.coffee_record_id::text
WHERE f.quality_assessment_id IS NULL
  AND EXISTS(SELECT 1 FROM public.finance_coffee_lots o WHERE o.coffee_record_id=f.coffee_record_id AND o.id<>f.id AND o.quality_assessment_id IS NOT NULL)
UNION ALL
SELECT 'batch_source_repeat:'||s.coffee_record_id, 'batch_source_repeat', 'Inventory', 'high',
  'Delivery counted more than once in stock batches',
  jsonb_build_object('delivery_id',s.coffee_record_id,'supplier',min(s.supplier_name),'entries',count(*),'kilograms',sum(s.kilograms),
    'action','Mark the delivery duplicate handling or remove the extra batch entry.'),
  '/inventory'
FROM public.inventory_batch_sources s JOIN recs r ON r.id=s.coffee_record_id
GROUP BY s.coffee_record_id HAVING count(*)>1;

CREATE OR REPLACE FUNCTION system_integrity_private.scan_system_red_flags()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE c record; flag_id uuid; n integer:=0; was_resolved boolean; candidates jsonb; BEGIN IF pg_trigger_depth()=0 AND auth.role() IS DISTINCT FROM 'service_role' AND session_user NOT IN ('postgres','supabase_admin') AND NOT public.can_manage_system_red_flags() THEN RAISE EXCEPTION 'Administrator access required'; END IF; PERFORM pg_advisory_xact_lock(hashtext('system_red_flags_scan'));
SELECT coalesce(jsonb_agg(to_jsonb(candidate)),'[]'::jsonb) INTO candidates FROM (
  SELECT fingerprint,rule_key,department,severity,title,details,review_path FROM public.system_red_flag_candidates
  UNION ALL
  SELECT fingerprint,rule_key,department,severity,title,details,review_path FROM system_integrity_private.coffee_flag_candidates k
   WHERE NOT EXISTS(SELECT 1 FROM system_integrity_private.coffee_flag_dismissals d WHERE d.fingerprint=k.fingerprint)) candidate;
FOR c IN SELECT * FROM jsonb_to_recordset(candidates) AS issue(fingerprint text,rule_key text,department text,severity text,title text,details jsonb,review_path text) LOOP SELECT id,status='resolved' INTO flag_id,was_resolved FROM public.system_red_flags WHERE fingerprint=c.fingerprint; IF flag_id IS NULL THEN INSERT INTO public.system_red_flags(fingerprint,rule_key,department,severity,title,details,review_path) VALUES(c.fingerprint,c.rule_key,c.department,c.severity,c.title,c.details,c.review_path) RETURNING id INTO flag_id; n:=n+1; ELSIF was_resolved THEN UPDATE public.system_red_flags SET status='open',resolved_at=NULL,assigned_to=NULL,last_detected_at=now(),details=c.details WHERE id=flag_id; n:=n+1; ELSE UPDATE public.system_red_flags SET last_detected_at=now(),details=c.details,title=c.title,severity=c.severity WHERE id=flag_id; END IF; IF NOT EXISTS(SELECT 1 FROM public.notifications WHERE type='system_red_flag' AND message LIKE '%'||flag_id::text||'%') OR was_resolved THEN INSERT INTO public.notifications(title,message,type,priority,target_user_id) SELECT c.title,c.department||': review required. Open Administrator Hub → System red flags. Task '||flag_id::text,'system_red_flag',CASE WHEN c.severity='critical' THEN 'urgent' ELSE 'high' END,r.user_id FROM (SELECT DISTINCT user_id FROM public.user_roles WHERE lower(role) IN ('admin','administrator','super admin','managing director'))r WHERE EXISTS(SELECT 1 FROM public.employees e WHERE e.auth_user_id=r.user_id AND e.status='Active' AND NOT coalesce(e.disabled,false)); END IF; END LOOP; UPDATE public.system_red_flags f SET status='resolved',resolved_at=now() WHERE status<>'resolved' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(candidates) candidate WHERE candidate->>'fingerprint'=f.fingerprint); RETURN jsonb_build_object('ok',true,'new_flags',n,'checked_at',now()); END; $function$;

CREATE OR REPLACE FUNCTION system_integrity_private.resolve_coffee_flag(p_action text, p_target text, p_keep text DEFAULT NULL, p_value numeric DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s record; f record; v_email text := public.current_user_email(); v_paid numeric := 0; v_removed int := 0;
BEGIN
  IF NOT public.can_manage_system_red_flags() THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_action = 'mark_duplicate' THEN
    IF p_keep IS NULL OR p_keep = p_target THEN RETURN jsonb_build_object('ok',false,'error','Choose which delivery to keep'); END IF;
    IF NOT EXISTS(SELECT 1 FROM coffee_records WHERE id=p_target) OR NOT EXISTS(SELECT 1 FROM coffee_records WHERE id=p_keep) THEN RETURN jsonb_build_object('ok',false,'error','Delivery not found'); END IF;
    FOR s IN SELECT * FROM inventory_batch_sources WHERE coffee_record_id=p_target FOR UPDATE LOOP
      UPDATE inventory_batches SET total_kilograms=greatest(total_kilograms-s.kilograms,0), remaining_kilograms=greatest(remaining_kilograms-s.kilograms,0), updated_at=now() WHERE id=s.batch_id;
      DELETE FROM inventory_batch_sources WHERE id=s.id;
    END LOOP;
    FOR f IN SELECT * FROM finance_coffee_lots WHERE coffee_record_id::text=p_target FOR UPDATE LOOP
      IF f.finance_status='PAID' OR coalesce(f.amount_paid_ugx,0)>0 THEN
        v_paid := v_paid + coalesce(nullif(f.amount_paid_ugx,0), f.total_amount_ugx, 0);
        UPDATE finance_coffee_lots SET finance_notes=coalesce(finance_notes,'')||' | DUPLICATE of '||p_keep||'. Amount paid is an OVERPAYMENT to recover. '||coalesce(p_note,'') WHERE id=f.id;
      ELSE DELETE FROM finance_coffee_lots WHERE id=f.id; v_removed := v_removed+1; END IF;
    END LOOP;
    INSERT INTO system_integrity_private.coffee_duplicate_marks(coffee_record_id,kept_record_id,note,marked_by) VALUES(p_target,p_keep,p_note,auth.uid())
      ON CONFLICT (coffee_record_id) DO UPDATE SET kept_record_id=excluded.kept_record_id, note=excluded.note, marked_by=excluded.marked_by, marked_at=now();
  ELSIF p_action = 'delete_lot' THEN
    SELECT * INTO f FROM finance_coffee_lots WHERE id::text=p_target FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Entry not found'); END IF;
    IF f.finance_status='PAID' OR coalesce(f.amount_paid_ugx,0)>0 THEN RETURN jsonb_build_object('ok',false,'error','This entry has payments and cannot be deleted'); END IF;
    DELETE FROM finance_coffee_lots WHERE id=f.id; v_removed := 1;
  ELSIF p_action = 'set_lot_price' THEN
    IF coalesce(p_value,0) <= 0 THEN RETURN jsonb_build_object('ok',false,'error','Enter a valid price'); END IF;
    SELECT * INTO f FROM finance_coffee_lots WHERE id::text=p_target FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Entry not found'); END IF;
    IF f.finance_status='PAID' OR coalesce(f.amount_paid_ugx,0)>0 THEN RETURN jsonb_build_object('ok',false,'error','This entry is already paid; record the difference and accept the flag instead'); END IF;
    UPDATE finance_coffee_lots SET unit_price_ugx=p_value, total_amount_ugx=round(p_value*quantity_kg), balance_ugx=round(p_value*quantity_kg)-coalesce(amount_paid_ugx,0) WHERE id=f.id;
  ELSIF p_action = 'dismiss' THEN
    IF nullif(btrim(coalesce(p_note,'')),'') IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Give a reason for accepting'); END IF;
    INSERT INTO system_integrity_private.coffee_flag_dismissals(fingerprint,note,dismissed_by) VALUES(p_target,p_note,auth.uid())
      ON CONFLICT (fingerprint) DO UPDATE SET note=excluded.note, dismissed_by=excluded.dismissed_by, dismissed_at=now();
  ELSE RETURN jsonb_build_object('ok',false,'error','Unknown action'); END IF;
  INSERT INTO audit_logs(action,table_name,record_id,record_data,reason,performed_by,department)
  VALUES('coffee_flag_'||p_action,'coffee_integrity',p_target,jsonb_build_object('keep',p_keep,'value',p_value,'paid_to_recover',v_paid,'removed_entries',v_removed),p_note,coalesce(v_email,auth.uid()::text),'Admin');
  PERFORM system_integrity_private.scan_system_red_flags();
  RETURN jsonb_build_object('ok',true,'paid_to_recover',v_paid,'removed_entries',v_removed);
END $$;

CREATE OR REPLACE FUNCTION public.resolve_coffee_flag(p_action text, p_target text, p_keep text DEFAULT NULL, p_value numeric DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SET search_path TO 'public' AS $$ SELECT system_integrity_private.resolve_coffee_flag(p_action,p_target,p_keep,p_value,p_note) $$;
REVOKE ALL ON FUNCTION public.resolve_coffee_flag(text,text,text,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_coffee_flag(text,text,text,numeric,text) TO authenticated;
REVOKE ALL ON FUNCTION system_integrity_private.resolve_coffee_flag(text,text,text,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION system_integrity_private.resolve_coffee_flag(text,text,text,numeric,text) TO authenticated;

SELECT system_integrity_private.scan_system_red_flags();