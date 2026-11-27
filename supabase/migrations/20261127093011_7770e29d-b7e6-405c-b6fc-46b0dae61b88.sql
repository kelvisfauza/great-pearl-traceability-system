UPDATE public.treasury_pool_balance
SET yo_balance = last_yo_synced_balance, updated_at = now()
WHERE id = 1 AND last_yo_synced_balance IS NOT NULL;