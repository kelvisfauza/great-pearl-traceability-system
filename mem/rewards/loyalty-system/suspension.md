---
name: Loyalty Awards Suspension Switch
description: Loyalty awards silently switched off for all employees from 22 Oct 2026 (mode 'off'); no payouts, no messages
type: feature
---
22 Oct 2026: management suspended all loyalty awards silently for everyone "for now".
- `system_settings.loyalty_awards` = `{"suspended": true, "mode": "off", "silent": true}`. In 'off' mode the ledger trigger drops reward inserts; the 8pm `daily-loyalty-payout` exits without crediting or notifying.
- No announcement/SMS/email about the suspension.
- Existing balances, ledger history and uncredited accruals are preserved — never delete them.
- To resume: set mode back to 'daily' (or 'instant') and suspended false.
