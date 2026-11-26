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

# Security fixes

- [ ] Review only the 52 selected findings and group them by affected code.
- [ ] Fix confirmed access-control, payment, messaging, and input-validation issues.
- [ ] Add or update focused tests for changed security rules.
- [ ] Deploy affected edge functions and apply required database migrations.
- [ ] Verify builds/tests and update each selected finding's status.
- [ ] Report fixed and remaining selected findings without changing any others.
