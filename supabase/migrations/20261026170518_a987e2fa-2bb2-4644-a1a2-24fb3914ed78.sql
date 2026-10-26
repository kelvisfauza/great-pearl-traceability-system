ALTER FUNCTION public.link_delivery_sampling() SECURITY DEFINER;
ALTER FUNCTION public.validate_delivery_sampling() SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.link_delivery_sampling() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_delivery_sampling() FROM PUBLIC, anon, authenticated;