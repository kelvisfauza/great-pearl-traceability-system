-- Read-only regression: internal debits return to General; phone withdrawals
-- have no internal destination and leave treasury. Division by zero fails
-- the query if any routing rule changes.
SELECT 1 / CASE WHEN public.treasury_resolve_account(
  'ADMIN_ADJUSTMENT', '', 'WITHDRAWAL', -280000
) = 'general' THEN 1 ELSE 0 END AS internal_debit_returns_to_general;

SELECT 1 / CASE WHEN public.treasury_resolve_account(
  'INSTANT_WITHDRAWAL', '', 'WITHDRAWAL', -65000
) IS NULL THEN 1 ELSE 0 END AS phone_withdrawal_leaves_system;