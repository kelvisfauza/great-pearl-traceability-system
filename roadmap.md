# Roadmap — Microsoft 365

- [x] Teams meetings: start/schedule + SMS to chosen staff
- [x] Staff: last sign-in column (needs AuditLog.Read.All)
- [x] Devices: new-this-week alert + not seen 3+ weeks filter
- [x] Security tab: risky accounts + unusual sign-ins (needs AuditLog.Read.All, IdentityRiskyUser.Read.All)
- [x] Create/disable Microsoft account — Accounts tab, admin confirms (needs User.ReadWrite.All)
- [ ] Reset staff Microsoft password — waiting on owner confirmation (high impact)
- [ ] Microsoft sign-in button built, hidden until owner enables Azure provider in Supabase Auth
- [ ] Mail delivery reports (message trace not in Graph; Exchange admin only) — blocked
- [x] Official notices from Fauzakusa@greatpearlcoffee.com — Notices tab (needs Mail.Send)
- [x] Copy signed documents to SharePoint — Documents tab (needs Sites.ReadWrite.All)

# Daily finance PDF

# Salary Finance handoff
- [ ] Route HR-approved salary payments to Finance without early wallet credits or emails.
- [ ] Add individual Finance wallet release with atomic duplicate/funding protection.
- [ ] Test approval/payment boundaries and notification timing; deploy and verify available flows.

# Daily finance PDF (completed)
- [x] Generate a saved finance snapshot with treasury account actions and payment status.
- [x] Schedule one report daily at 8 PM Uganda time to Fauza's admin email.
- [x] Inspect all six PDF pages, correct rejected balances in pending lists, and pass six timing/accounting tests.
- [x] Send the November 25 test email: noreply service accepted and queued it; inbox delivery is not confirmed. Private PDF link used because the existing sender has no attachment support.

# Security fixes (selected findings)

- [x] Review only the 52 selected findings and group them by affected code.
- [x] Preserve custom supplier/support replies for assigned staff and administrators.
- [x] Preserve external meal/support recipients with saved details and independent approval.
- [x] Apply selected access-control, payment, messaging, and input-validation fixes; revoke all legacy payslip links.
- [x] Add and run focused security tests: 16 Deno tests, 75 browser-independent tests, and rollback-only database checks.
- [x] Deploy affected edge functions and apply required database migrations.
- [x] Verify build and signed-out desktop/mobile payslip access; update verified selected findings only.
- [ ] Verify signed-in payment approval, assigned replies and payslip downloads — blocked: external Supabase cannot mint a preview session.
- [ ] Complete independent self-benefit approval for airtime batches (lov_finding_d8358fe31f23b951) — recipient/amount checks applied; real administrator workflow requires signed-in verification.
- [ ] Identify owners of three preserved historical payslips — blocked: unmatched employee identities; administrator-only recovery retained.
- [x] Report selected fixes and remaining verification limits; leave unrelated findings unchanged.
