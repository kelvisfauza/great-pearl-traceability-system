GRANT EXECUTE ON FUNCTION public.get_guarantor_candidates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_wallet_funds_secure(text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unified_user_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_balance_safe(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_withdrawal_balance(uuid, numeric) TO authenticated;