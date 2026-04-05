
INSERT INTO ledger_entries (user_id, entry_type, amount, reference, metadata, created_at)
VALUES (
  '7cdf79bf-c024-4107-98a7-3d84dbf0e975',
  'WITHDRAWAL',
  -200000,
  'CASH-WD-DENIS-200K-' || gen_random_uuid(),
  '{"source": "cash_withdrawal", "method": "Cash", "approved_by": "Fauza Kusa", "description": "Cash withdrawal - UGX 200,000"}'::jsonb,
  '2026-04-02T10:00:00+03:00'
);

INSERT INTO approval_requests (
  id, title, type, description, amount, department, requestedby, requestedby_name,
  daterequested, status, priority, finance_approved, finance_approved_by,
  finance_approved_at, admin_approved, admin_approved_by, admin_approved_at, created_at
) VALUES (
  gen_random_uuid(),
  'Cash Withdrawal - Bwambale Denis (UGX 200,000)',
  'Cash Withdrawal',
  'Cash withdrawal of UGX 200,000 for Bwambale Denis - approved and disbursed',
  200000,
  'Operations',
  'bwambaledenis@greatpearlcoffee.com',
  'bwambale denis',
  '2026-04-02',
  'fully_approved',
  'normal',
  true,
  'fauzakusa@greatpearlcoffee.com',
  '2026-04-02T10:00:00+03:00',
  true,
  'fauzakusa@greatpearlcoffee.com',
  '2026-04-02T10:00:00+03:00',
  '2026-04-02T10:00:00+03:00'
);
