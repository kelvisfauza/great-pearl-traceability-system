REVOKE EXECUTE ON FUNCTION public.complete_grn_referral(text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_grn_referral(text, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_grn_referral(text, uuid, text) TO authenticated;