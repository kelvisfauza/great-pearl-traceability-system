REVOKE ALL ON public.gosentepay_payout_receipts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.gosentepay_payout_receipts TO service_role;