-- Credit Benson the missing 22,000 UGX from his overtime bonus (was credited 11,000 at old rate, should have been 33,000 at 3,000/hr)
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
VALUES (
  'eba97d3e-f098-467a-ad78-d0b9639d76a8',
  'BONUS',
  22000,
  'BNS-CORRECTION-20260405-OT-BENSON',
  'SYSTEM_AWARD',
  '{"bonus_id": "769800e0-3d58-449b-a10e-28648e1b1a26", "reason": "Overtime bonus correction: difference between 33,000 (3,000 UGX/hr × 11hrs) and 11,000 (1,000 UGX/hr × 11hrs) originally credited", "correction": true}'::jsonb
);