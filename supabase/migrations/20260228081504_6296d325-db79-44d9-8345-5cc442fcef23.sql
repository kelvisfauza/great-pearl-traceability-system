-- Deduct 3000 from sserunkuma for disputed failed deposit
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
VALUES (
  '5ac019de-199c-4a3f-97de-96de786f55dc',
  'ADJUSTMENT',
  -3000,
  'ADJ-FAILED-DEPOSIT-DEP-1772265997394-zk1r1v',
  '{"reason": "Correction for failed GosentePay deposit of UGX 3000", "admin_action": true}'::json,
  NOW()
);