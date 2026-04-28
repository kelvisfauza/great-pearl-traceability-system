-- Refund Timothy for the two earlier MoMo direct loan repayments that wrongly debited his wallet.
-- Apr 17: UGX 50,000 (Yo ref 40038702029)
-- Apr 21: UGX 50,000 (Yo ref 40138513745)
-- These complete the correction (previous migration only refunded Apr 26 + Apr 27).

INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata)
VALUES
(
  '010f057a-92e3-479d-89b2-a801ef851949',
  'DEPOSIT',
  50000,
  'REFUND-LOAN-MOMO-273090bb-3-' || extract(epoch from now())::bigint,
  jsonb_build_object(
    'description', 'Refund: MoMo loan repayment of UGX 50,000 wrongly debited from wallet on 2026-04-17 (Yo confirmed payment, wallet should not have been charged).',
    'reason', 'MoMo direct loan repayment double-charged the wallet. Corrected per paired-entry policy.',
    'original_ledger_id', '3872e1ce-3b31-4b83-9b40-c59e6576c5e4',
    'yo_network_ref', '40038702029',
    'loan_id', '273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd',
    'corrective_entry', true
  )
),
(
  '010f057a-92e3-479d-89b2-a801ef851949',
  'DEPOSIT',
  50000,
  'REFUND-LOAN-MOMO-273090bb-4-' || extract(epoch from now())::bigint,
  jsonb_build_object(
    'description', 'Refund: MoMo loan repayment of UGX 50,000 wrongly debited from wallet on 2026-04-21 (Yo confirmed payment, wallet should not have been charged).',
    'reason', 'MoMo direct loan repayment double-charged the wallet. Corrected per paired-entry policy.',
    'original_ledger_id', '2b133a4f-f060-4b42-9645-9e951ca98b80',
    'yo_network_ref', '40138513745',
    'loan_id', '273090bb-bc3e-4fd0-b0b6-54f2ea3e9fdd',
    'corrective_entry', true
  )
);