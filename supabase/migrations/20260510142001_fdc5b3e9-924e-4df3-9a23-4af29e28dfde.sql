UPDATE public.treasury_pool_balance
SET yo_balance = yo_balance + 2000000,
    updated_at = now()
WHERE id = 1;

INSERT INTO public.treasury_pool_entries
  (direction, amount, channel, category, reference, description, performed_by, balance_after, metadata)
SELECT 'credit', 2000000, 'yo_payments', 'topup',
       'YO-TOPUP-' || to_char(now(),'YYYYMMDDHH24MISS'),
       'Manual top-up of Yo Payments float (UGX 2,000,000) — admin-initiated',
       'admin',
       yo_balance,
       jsonb_build_object('source','admin_manual_topup','bucket','yo_balance')
FROM public.treasury_pool_balance WHERE id = 1;