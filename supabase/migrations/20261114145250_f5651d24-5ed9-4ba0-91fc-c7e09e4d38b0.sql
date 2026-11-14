ALTER TABLE public.per_diem_requests ADD COLUMN approved_at timestamptz, ADD COLUMN approved_by uuid, ADD COLUMN rejected_at timestamptz, ADD COLUMN rejected_by uuid, ADD COLUMN rejection_reason text;

CREATE OR REPLACE FUNCTION per_diem_private.review(p_id uuid, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS public.per_diem_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.per_diem_requests%rowtype;
BEGIN
 IF NOT public.is_active_staff() OR NOT (public.has_role(auth.uid(),'Administrator'::public.app_role) OR public.has_role(auth.uid(),'Super Admin'::public.app_role)) THEN RAISE EXCEPTION 'Only an active administrator may review per diem requests'; END IF;
 IF p_approve IS NULL THEN RAISE EXCEPTION 'Choose approve or reject'; END IF;
 SELECT * INTO r FROM public.per_diem_requests WHERE id=p_id FOR UPDATE;
 IF r.id IS NULL OR r.status<>'pending' OR r.printed_at IS NULL OR r.approved_at IS NOT NULL THEN RAISE EXCEPTION 'This request is not awaiting administrator approval'; END IF;
 IF r.created_by=auth.uid() OR lower(r.employee_email)=lower(auth.jwt()->>'email') OR public.get_unified_user_id(r.employee_email)=public.get_unified_user_id(auth.jwt()->>'email') THEN RAISE EXCEPTION 'You cannot review your own per diem request; another administrator must review it'; END IF;
 IF p_approve THEN
  PERFORM pg_advisory_xact_lock(hashtext('per_diem_sunday:'||r.employee_id::text));
  PERFORM per_diem_private.check_sunday(r);
  UPDATE public.per_diem_requests SET approved_at=now(),approved_by=auth.uid() WHERE id=r.id RETURNING * INTO r;
 ELSE
  IF nullif(trim(p_reason),'') IS NULL OR length(p_reason)>1000 THEN RAISE EXCEPTION 'Enter a rejection reason of up to 1,000 characters'; END IF;
  UPDATE public.per_diem_requests SET status='rejected',rejected_at=now(),rejected_by=auth.uid(),rejection_reason=trim(p_reason) WHERE id=r.id RETURNING * INTO r;
 END IF;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION per_diem_private.review(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION per_diem_private.review(uuid,boolean,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.review_per_diem_request(p_id uuid,p_approve boolean,p_reason text DEFAULT NULL)
RETURNS public.per_diem_requests LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$ SELECT per_diem_private.review(p_id,p_approve,p_reason); $$;
REVOKE ALL ON FUNCTION public.review_per_diem_request(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_per_diem_request(uuid,boolean,text) TO authenticated;

DO $$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('per_diem_private.award(uuid)'::regprocedure) INTO definition;
 definition:=replace(definition, 'if r.id is null or r.status<>''pending'' or r.printed_at is null then raise exception ''Select a submitted printed per diem request that has not been awarded''; end if;', 'if r.id is null or r.status<>''pending'' or r.printed_at is null or r.approved_at is null or r.approved_by is null then raise exception ''Administrator approval is required before awarding per diem''; end if;');
 IF definition=pg_get_functiondef('per_diem_private.award(uuid)'::regprocedure) THEN RAISE EXCEPTION 'Expected award approval guard was not found'; END IF;
 EXECUTE definition;
END $$;

-- Only the atomic request-based award routine can create awards for staff callers.
REVOKE INSERT ON public.per_diem_awards FROM PUBLIC,anon,authenticated;
CREATE POLICY per_diem_admin_review_read ON public.per_diem_requests FOR SELECT TO authenticated USING (public.is_active_staff() AND (public.has_role(auth.uid(),'Administrator'::public.app_role) OR public.has_role(auth.uid(),'Super Admin'::public.app_role)));
