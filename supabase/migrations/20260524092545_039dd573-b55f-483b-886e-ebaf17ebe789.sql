ALTER FUNCTION public.touch_device_tokens_updated_at() SET search_path TO 'public';
ALTER VIEW public.conversation_list_view SET (security_invoker = true);