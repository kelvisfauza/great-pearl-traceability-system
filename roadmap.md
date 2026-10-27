# Roadmap

## Clearance confirmation and printed heading repair
- [x] Align contract selection and confirmation so Procurement can confirm its chosen active contract despite different buyer labels; database function verified and KCL BUGOYE/Kyagalanyi regression passed.
- [x] Remove obsolete parent-company wording from frontend print generators; generated receipt heading checked, 21 regression tests passed and latest build clean.
- [ ] Verify signed-in confirmation and printing — external Supabase session unavailable.

## Procurement figure accuracy
- [x] Replace fabricated prices and trends, calculate weekly purchases from paginated saved deliveries, and correct metric labels and periods; saved reference prices are Drugar 14,200, Wugar 17,800 and Robusta FAQ 11,000 UGX/kg.
- [x] Eleven calculation/quality tests passed and preview has no reported runtime errors; latest build clean.
- [ ] Verify signed-in Analytics figures — external Supabase authentication is unavailable; public preview remained blank and cannot verify the staff page.

## Paper meal-plan requests
- [x] Add numbered A4 meal-plan templates and Procurement entry for paper reference, amount, payee and cash/mobile-money choice in V1/V2.
- [x] Preserve normal review/approval/release; unique paper references block duplicates and shared rules enforce cash/mobile-money routing for full and partial releases.
- [x] Verify one-page A4 dimensions and layout and eight reference/payment/print-issuance tests; payment handlers deployed and build clean.
- [ ] Verify real signed-in issuance, Procurement submission, Admin approval and Finance payout — authenticated checks unavailable for external Supabase.

## Store sampling pickup texts
- [x] Notify Alex and Onesmus when Ben creates a new sampling order; validate saved creator identity and suppress disabled recipients. Three rule tests passed, functions deployed, unauthenticated request rejected.
- [ ] Verify delivery of pickup texts after Ben saves a real order — signed-in end-to-end checks unavailable for external Supabase.

## Batch-based clearance and Procurement confirmation
- [x] Source clearance lines from batches and remove contract choice, comparison linking and uploads from Store; preserve automatic numbering and paired printing.
- [x] Send saved clearances to a live Procurement queue for contract or spot-sale confirmation in V1/V2, with permission-checked confirmation and recorded identity/time.
- [x] Validate batch/confirmation rules and public-access rejection — 13 tests passed, anonymous confirmation denied, latest build clean.
- [ ] Verify signed-in batch selection, saved request, Procurement confirmation and Store status update — authenticated checks unavailable for external Supabase.

## Store coffee delivery intake
- [x] Ask whether a sample was taken and atomically link a matching supplier sampling order when Yes, in both Store versions and offline uploads.
- [x] Reserve and show the delivery batch number during entry; save that same number and preserve stock-batch creation after inventory promotion.
- [x] Test sampling rules — seven focused tests and four dispatch regression tests passed; database triggers installed and build clean.
- [ ] Verify signed-in delivery saving and batch display — external Supabase session unavailable; public browser check stopped at the location-permission screen.

## Store clearance and sales delivery notes
- [x] Add paired numbered clearance/delivery-note creation to both Store pages and prompt printing both after save.
- [x] Show delivery notes on both Sales pages with administrator-only sale attachment.
- [ ] Verify signed-in creation, sale attachment and paired printing — external Supabase session unavailable; local validation and public-access rejection tests cover available checks.

## Printed QR verification
- [x] Restore verification for issued quality and store form QR codes, including existing printed sheets, without exposing analysis data (public QR flow and live regression tests passed).

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

## Store-proposed suppliers and clearance fixes
- [x] Fix Procurement clearance confirmation contract dropdown to match buyer names loosely and fall back to all active contracts.
- [x] Remove the "Member of HELLO YEDA" line from printed store clearance / delivery notes.
- [x] Let store managers propose suppliers attached to a coffee delivery; admin/Procurement confirm (permanent supplier) or decline (choose real supplier) via guarded RPCs.
- [ ] Verify signed-in proposal, confirmation and decline flows — authenticated checks unavailable for external Supabase.
