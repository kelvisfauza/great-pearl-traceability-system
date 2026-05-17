-- Write off John Masereka's negative wallet balance (-119,583 UGX) as company loss
-- Root cause was a system bug that double-credited airtime/data allowances and a
-- weak instant-withdrawal balance check. Bug has been patched; this entry resets
-- his wallet to zero so he starts clean.
INSERT INTO ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
SELECT
  '1922048f-c0b9-422e-9b42-47713a75c1ca',
  'BONUS',
  119583,
  'WALLET-RESET-JOHN-MASEREKA-20260517',
  'SYSTEM_AWARD',
  jsonb_build_object(
    'description', 'Wallet reset write-off — company loss due to airtime/data double-credit bug + instant-withdrawal balance-check bug',
    'reason', 'system_bug_writeoff',
    'approved_by', 'Fauzakusa@greatpearlcoffee.com',
    'bypass_treasury_check', true
  )
WHERE NOT EXISTS (
  SELECT 1 FROM ledger_entries WHERE reference = 'WALLET-RESET-JOHN-MASEREKA-20260517'
);