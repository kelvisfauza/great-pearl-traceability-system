
DELETE FROM public.ledger_entries
WHERE metadata->>'backfill' = 'true'
  AND metadata->>'source' = 'overtime_reward'
  AND reference NOT IN (
    'OT-AWARD-1682570e-bd2e-4fd6-92a4-8863ab589aca',
    'OT-AWARD-28ae098d-27d2-4afb-8e4c-3ffd54dc63ca'
  );
