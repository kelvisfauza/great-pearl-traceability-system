-- Fix the failed admin withdrawal for Timothy (ADM-WD-888F18E7)
-- The original entry went to wrong user_id with wrong entry_type and wrong sign

-- Delete the incorrect entry
DELETE FROM ledger_entries WHERE reference = 'ADM-WD-888F18E7' AND user_id = '6a1a2e65-4d07-4e0d-a016-34143297caaa';

-- Insert the correct deduction with proper unified user_id, entry_type, and negative amount
INSERT INTO ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
VALUES (
  '010f057a-92e3-479d-89b2-a801ef851949',
  'WITHDRAWAL',
  -500000,
  'ADM-WD-888F18E7',
  'WITHDRAWAL',
  '{"description": "Cash Withdrawal: cash", "initiated_by": "bwambale denis", "type": "admin_cash_withdrawal"}'::jsonb
);