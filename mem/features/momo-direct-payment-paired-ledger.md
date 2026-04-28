---
name: momo-direct-payment-paired-ledger
description: How to record MoMo-direct payments (loan repayments, etc.) on user statements without touching wallet
type: feature
---
When a user pays for something via MoMo directly (cash flows from their phone → company, never via wallet), record TWO paired ledger entries on Yo SUCCESS confirmation:

1. **DEPOSIT** (+amount) — `source: <purpose>_in`, ref `<PURPOSE>-MOMO-IN-<id>-<ts>`, description "MoMo received from <phone>"
2. **Matching debit** (e.g. LOAN_REPAYMENT for loans) (-amount) — `source: <purpose>_out`, ref `<PURPOSE>-MOMO-REPAY-<id>-<ts>`

**Why:** Net wallet impact = 0 (cash never went through wallet) but the user's statement shows both lines so they can see what happened.

**Rules:**
- Only post AFTER Yo confirms SUCCESS — never on initiation.
- Use `get_unified_user_id` (via employees.email) for both entries — never raw `transaction.user_id`.
- Idempotency: check for existing entry matching `metadata->>transaction_ref` before posting to prevent double-posts on retries.
- Currently implemented in: `supabase/functions/gosentepay-callback/index.ts` for loan_repayment.
