---
name: GRN Secure Pay Codes
description: Random checksum-protected pay codes replace sequential batch numbers as the payable GRN key
type: feature
---
Sequential batch numbers (20260522004 vs ...005) made a single typo pay the wrong GRN.

- Every GRN gets an immutable random 9-char code in `grn_pay_codes` (alphabet `23456789ABCDEFGHJKMNPQRSTVWXYZ`, 8 random chars + weighted mod-30 check char), displayed as `GAC-K7Q-M4X-T9`.
- Created lazily by `get_or_create_grn_pay_code(batch)` (called during GRN print enrichment / when the pay page opens).
- GRN QR codes encode `/grn/GAC-...`; the printed footer shows the pay code.
- `resolve_grn_reference(code)` returns NULL for a code that fails the checksum — a typo never falls through to another batch. Legacy batch numbers and GPCF verification codes still resolve.
- Frontend helpers: `src/utils/grnPayCode.ts` (`isValidPayCode`, `looksLikePayCode`, `formatPayCode`, `getGrnPayCode`).
