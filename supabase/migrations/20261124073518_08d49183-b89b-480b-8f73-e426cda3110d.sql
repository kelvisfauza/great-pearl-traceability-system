DROP POLICY "Shared vendor account staff reads" ON public.service_providers;
CREATE FUNCTION vendor_accounts_private.payments(p_vendor uuid,p_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF NOT vendor_accounts_private.allowed() THEN RAISE EXCEPTION 'Only active Finance, Procurement and administrators can access vendor accounts'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.service_providers WHERE id=p_vendor) THEN RAISE EXCEPTION 'Vendor account not found'; END IF;
 WITH items AS (
 SELECT p.id,p.created_at,p.amount,p.withdraw_charge,p.total_amount,p.service_description,p.payment_method,p.yo_status,p.yo_reference,p.initiated_by_name,p.notes
 FROM public.service_provider_payments p WHERE vendor_accounts_private.match(p.receiver_name,p.receiver_phone)=p_vendor AND NOT EXISTS(SELECT 1 FROM public.provider_submission_requests r WHERE r.payout_record_id=p.id)
 ) SELECT jsonb_build_object('count',count(*),'paid',coalesce(sum(amount+withdraw_charge) FILTER(WHERE yo_status IN ('paid','success','cash')),0),'payments',(SELECT coalesce(jsonb_agg(to_jsonb(page)),'[]'::jsonb) FROM(SELECT * FROM items ORDER BY created_at DESC,id LIMIT 50 OFFSET greatest(p_offset,0))page)) INTO result FROM items;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION vendor_accounts_private.payments(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION vendor_accounts_private.payments(uuid,integer) TO authenticated,service_role;
CREATE FUNCTION public.vendor_account_payments(p_vendor uuid,p_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$ SELECT vendor_accounts_private.payments(p_vendor,p_offset); $$;
REVOKE ALL ON FUNCTION public.vendor_account_payments(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.vendor_account_payments(uuid,integer) TO authenticated,service_role;