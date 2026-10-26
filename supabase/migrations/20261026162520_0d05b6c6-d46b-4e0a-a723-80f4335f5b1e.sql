REVOKE ALL ON FUNCTION public.confirm_clearance_procurement(uuid,text,uuid) FROM anon;
REVOKE ALL ON FUNCTION store_dispatch_private.confirm_clearance_procurement(uuid,text,uuid) FROM anon;
REVOKE ALL ON FUNCTION store_dispatch_private.can_confirm_clearance() FROM anon;
REVOKE ALL ON FUNCTION public.guard_clearance_procurement() FROM anon;