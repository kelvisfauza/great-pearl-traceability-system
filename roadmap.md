# Roadmap

## Printed QR verification
- [ ] Restore verification for issued quality form QR codes, including existing printed sheets, without exposing analysis data.

## Sales and stock correction
- [x] Remove the confirmed duplicate 31 March sale with an audit record and reconcile affected stock allocations.
- [x] Make deletion/cancellation restore stock atomically and prevent silent deletion failures and repeated deductions (live correction verified; isolated database regression test unavailable).

- [x] Add shared printed-by footers and registered verification QR codes to browser prints, PDF downloads and Word templates (tests and controlled HTML/PDF/Word samples checked; signed-in production issuance unavailable on external Supabase)

- [x] Link Outlook analysis postings to sampling orders and deliveries; attachment-only and minute rules tested, live collector imported two further forms; signed-in confirmation UI unavailable on external Supabase

- [x] Collect Outlook quality analysis attachments and add V1 Quality Analysis Postings with administrator review (two actual PDF forms imported; authenticated review UI unavailable on external Supabase)

- [x] Add admin red-flag tasks for missing Quality analysis attachments, duplicate Store clearance numbers and cross-department integrity issues (database rules and lifecycle verified; authenticated UI review unavailable on external Supabase)

- [x] Prevent old price SMS senders, queued messages and resends from repeating standalone buying and local-reference prices

- [x] Make print popup cancellation release the dialog even when print-window cleanup fails
- [x] Make V1 inventory batches self-explanatory with stock, supplier, quality, cost and expandable history details

- [x] Prepare a native Android application project for the existing system, using bundled app files rather than the preview website
- [x] Reorganize V1 and V2 navigation: Procurement Review, Leave Requests, Excel Reports, Trade/Bookings, Admin tools; temporarily freeze My Deductions
- [x] Create International Coffee Day greeting poster and prepare September month-end report submission and reminder
- [ ] Send Coffee Day greeting and September report reminder by email to employees — ready in Communications with the poster; administrator must sign in and confirm Send to everyone
- [x] Supplier Advance Agreement template in Company Forms (terms, recovery, legal action, crop year, amount, ref, issue date)
- [ ] John Masereka: loan refund not visible on statement; wallet shows UGX 23k — verify ledger entries

## Procurement reports (v1 + v2)
- [x] Add a Reports section on Procurement (v1 and v2) showing Store Purchase report, EUDR report, Store Clearance report, Sales report
- [x] Add a "Create Comprehensive Report" action combining all four into one printable/PDF report
