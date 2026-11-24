# Roadmap

## Selected one-off price sender — 24 November 09:19 UTC
- [x] Retired unused send-muhiwa-price for only lov_finding_08836b3583d10dca_138ea6d6 and lov_finding_08836b3583d10dca_f7a7c173. Nineteen focused/regression tests passed; deployed and live custom/default requests returned the retirement refusal. Normal broadcasts and other open findings remain untouched; no real messages sent. Architecture note omitted because AGENTS.md is at its protected size budget.
- [x] Follow-up code-read sweep: retired sender remains side-effect-free (five tests rerun). PriceUpdateModal and ReferencePriceInput send browser-selected fields with public-key tokens (central sender rejects those tokens); PriceApprovalPanel signs in but constructs targets/content in the browser and includes fixed additional contacts. ComprehensiveSMSManager, SMSFailureManager and SMSService likewise submit caller-owned phone/content; development fallback can falsely report success. Communications/send-broadcast and MessagingSettings/send-message permit custom/test destinations and content; send-message permits non-disabled staff. system-sms, test-sms and send-infobip-sms authorize privileged callers but accept arbitrary phone/content. send-sms checks sign-in/staff, types and deduplication, not saved price/recipient binding. Queue processing and resend-price-updates/retry-failed-sms/retry-today-failed-sms use saved queue/log payloads rather than new caller message fields, without revalidating business authority. Analyst-price-reminder uses saved enabled analysts and generated reminder content. Read four live queue-writing routines (approve_transfer_reversal, reject_transfer_reversal, reverse_wallet_transfer, notify_withdrawal_status_change): generated notices use saved request/ledger/employee data, with withdrawal-phone fallback; no dedicated price-text routine or reference to the retired sender found. Cron inventory has no retired-sender target and three active five-minute retry jobs; schedules unchanged. These related issues remain outside the two selected finding IDs; request broader approval before changing them. Other notification families, actual signed-in sends, inbox delivery and scheduled execution are not exhaustively verified. No historical records, permissions or settings changed.

## Selected security batch — 24 November 09:03 UTC
- [x] Additional code-read inventory checked Messaging Settings, Communications, quotation reply hooks, QR access UI, QuickLoans evaluation, mobile/desktop fingerprint callers, mobile dispatch uploads, Excel export button/helper, GroupCall leave/end reward calls, Procurement paid-meal receipt endpoint, and live attendance/import/time-record/budget/group-call policies plus allocation/deletion/allowance/meeting/QR routines. Manual content/destinations, private financial lookup, credential-ID-only proof, upload overwrite and self-authored credit evidence remain contextual selected risks; no wider permissions or settled records changed. This is a bounded sweep, not an exhaustive re-read of all 41 remaining selected endpoint families; remaining families and actual signed-in flows still require follow-up.
- [x] Follow-up sweep read Settings/Admin suspension controls and server suspend/lift actions; all use the selected saved identity, while notification delivery claims still need a separate decision because HTTP success does not prove delivery and disabled-recipient suppression remains authoritative. Read all TwoFactorVerification send/verify/autofill paths, alternate bypass service and current service-only database grants; bypass lookups are identity-bound. Read meal/service-provider/per-diem receipt callers, shared receipt sender, POST/GET receipt link, signature helper and provider-release issuance; POST honors existing storage rights, but long-lived bearer links and browser recipient overrides remain open contextual findings. Read scheduled/test Operations reporting and both live private-header cron jobs (17:00/17:25 UTC); unified both recipient branches to exact saved active, non-disabled administrators. Read retired termination service and salary sender/payslip generation; former cannot send, latter still issues one-year bearer documents pending private-link approval. Fifty-nine focused tests passed; report deployed and live invalid-session denial rechecked. No settled data, schedules or permissions changed in this follow-up.
- [x] Fixed and marked five of the 46 selected findings: saved suspension identity/contacts, owner-only verification bypass plus service-only underlying lookup, authorized Operations-report test recipients, storage-authorized receipt-link issuance and retirement of the dated public termination sender. Deployed five services; 57 focused tests passed, live invalid/anonymous calls denied, public-key verification reveals no bypass and database grants preserve trusted services. No messages, payouts or employee changes were made.
- [ ] Remaining 41 selected findings require contextual decisions: manual message content/recipients, private/payslip links, fingerprint assertion proof, payout/airtime/collection limits, deletion targets, self-authored attendance/budget/meeting authority, guarantor consent, applicant verification and file/Excel overwrite rights. Asked for messaging/private-link and independent-review/payout confirmation; preserve existing workflows and unrelated findings until answered. Actual signed-in staff success flows remain unverified because the external backend has no automated preview session.

## Maintenance activation — 24 November 08:47 UTC
- [x] Follow-up sweep read Settings/IT entry points, shared manual controls and SMS confirmation, whole-app guard/bypasses, recovery, schedule controls, read-only AI search, both hashing triggers, public status and all three recovery checks. Fixed legacy code/PIN crypt lookup, missing-row schedule success, early online recovery display, scheduled-only recovery and late signed-in guard handling. Eleven focused tests and expanded rollback administrator checks passed; refreshed desktop/mobile simulated-status browser checks passed. No live settings or records changed; real signed-in browser activation, live scheduled boundary timing, SMS delivery and background-job shutdown remain unverified. Maintenance controls govern screen access, not an established stop of payment/other background workers.
- [x] Read activation, public status, guard, recovery, schedule controls and live maintenance triggers. Reproduced missing unqualified crypt/gen_salt lookup; repaired both activation hashing and recovery verification using the installed extensions schema without changing permissions or settings.
- [x] Five focused activation tests passed, plus rollback-only real protected-administrator activation/hash/wrong-code/valid-recovery checks. Desktop and mobile browser checks with simulated manual/scheduled status verified maintenance blocking, recovery access and restored online state; build clean. Current live maintenance row remains inactive and unchanged. SMS acceptance is now checked before reporting delivery; no real SMS sent. Full signed-in browser activation and inbox/phone delivery remain unverified on the external unmanaged backend.

## Selected security batch — 24 November 08:26 UTC
- [x] Reviewed the 65 selected findings; fixed 16 selected database creation/read rules, both direct activity-award findings and false Procurement-return notices. Only those 19 were marked fixed.
- [x] Passed 56 focused tests plus rollback-only database checks for unauthorized access, real authors, existing protected administrator labels and zero browser-issued rewards. Deployed the notice service and verified live invalid-session rejection after pinning compatible SDK dependencies. No real messages, payments, settings or settled records changed.
- [ ] Remaining 41 selected findings await workflow/access decisions after the five fixes in the 09:03 batch: saved recipients versus manual messages, guarded private/public links and fingerprint proof, payout destinations, attendance/meeting/budget authority, loan-data consent and file overwrite permissions. Preserve existing workflows meanwhile; real signed-in staff success checks remain unverified. Company-name wording also awaits the user's answer; neither prices nor company wording changed.

## Related-flow security review — 24 November
- [x] Re-read 30 literal-table consumers plus approval, fingerprint, alternate report/Firestore, pricing and AI/broadcast paths; read live ownership policies, relevant database routines and existing scheduler metadata. Delivered a detailed code-read/status inventory; did not claim complete signed-in or scheduler verification.
- [x] Closed an additional gap inside the selected fingerprint-details finding: check employee availability before credential access across all four actions. Forty-five focused tests passed; deployed service and live invalid-session denial verified. Settled records, unselected settings/permissions and the 65 open selected findings unchanged.
- [ ] Additional paths need owner approval outside the selected creation/read fixes: broad existing-record updates, calculation-author insertion, absence self-appeal status guard, missing-field SMS-failure triggers, separate legacy report storage/role rules and duplicate attendance/overtime schedulers. Real signed-in report/fingerprint/appeal/printing success remains unverified because no automated employee browser session is available on the external backend.

## Selected security follow-up — 24 November
- [x] Reviewed only the 87 selected findings. Fixed and marked 22 through the security manager: recorded-approver rewards, owner-only fingerprint detail lookup, saved-template caller-scoped reports, and 18 selected creation/read policies. No other findings fixed or ignored; loyalty remains suspended and no funds/messages sent.
- [x] Forty focused handler and existing payment-security tests passed; rollback-only staff checks preserve genuine attendance and reject impersonation, verify eight additional ownership predicates, protect reward helper execution and leave the ledger unchanged. Both changed services deployed; anonymous and invalid callers denied; preview build clean. A pre-existing message-failure trigger references a missing verification_code field; left unchanged as unselected, and policy validation avoids it.
- [ ] Remaining 65 selected findings (49 service/function findings and 16 policy findings) require decisions on intended reference-data audiences, manual messages/private report destinations, saved payout targets/collection contracts, activity/meeting reward evidence, public QR/fingerprint/job/attachment flows and private receipt/payslip links. Do not disable these workflows or mark these findings fixed without confirmed access contracts.
- [ ] Verify actual signed-in report generation and fingerprint lookups: external unmanaged Supabase has no available automated staff session; isolated authorized-handler and database-identity checks do not verify the complete staff screen flow.

## System email delivery investigation
- [x] Read shared transactional sender, internal authentication and report/approval/access sender call sites; existing sending logs show 69 accepted sends on 23 November and 8 on 24 November, not confirmed inbox delivery. Channel preferences have no overriding rows.
- [x] Checked Fauza's connected Outlook across mailbox folders: system messages reached Inbox through 23 November 17:00 UTC (20:00 Uganda); no messages from any sender appear after that time. Today's saved meal approval send is absent. This verifies the missing message in one real mailbox, not a proven outage cause or every employee mailbox.
- [ ] Trace missing delivery with mail-provider message tracing: provider bounce/delivery receipts unavailable in current tools; Outlook mailbox-rule inspection denied for missing MailboxSettings.Read. Sender is reported Active but project setup also reports verification timed out; external DNS lookup unavailable in sandbox. Preserve sender domain, security checks, settings and delivered records until a blocking cause is verified.

## Selected security findings — 24 November
- [x] Reviewed the 170 selected findings; marked 117 verified fixes through the security manager without fixing or ignoring other findings. Removed 31 selected personal-data log exposures; escaped ten document generators and four email builders; protected three CSV exports, settings merge, credential randomness, recording ownership, deposit ownership and four saved recipient/action boundaries.
- [x] Deployed 32 early-authenticated staff/report/airtime entry points and associated fixes; all 32 deployed anonymous calls denied before side effects. Seven internal database helpers now deny anon/authenticated execution and retain server/owner access. No balances recalculated, historical records removed, funds sent or test messages sent.
- [x] Forty-nine focused browser-rule/handler/document tests and eight Deno rules tests passed; actual terms builder renders injected names as text with no injected images or executed handler. Latest preview build clean. Shared Deno test-tool run hit unrelated pre-existing extensionless test imports; exact new test files pass directly.
- [ ] Remaining 49 service/function findings from this earlier selection await explicit decisions where fixes change existing workflows: arbitrary/manual messaging and external recipients; workbook targets; activity/meeting reward eligibility; own attendance/budget authority; public QR/fingerprint approval/job/attachment flows; private receipt/payslip access; and remaining payout destination/collection contracts. The follow-up above resolved four more of the former 53; all unresolved findings remain active. Asked about saved-recipient messages and signed-in email approval links; wider workflow decisions still need confirmation.
- [ ] Verify real authorized staff success paths after hardening — external unmanaged Supabase supplies no automated staff browser session. Anonymous denial, isolated handlers and browser print escaping are verified, not real signed-in approval/payment flows.

## Shared service-provider accounts
- [x] Shared Finance/Procurement vendor directory, unique numbers, creation, account histories, recorded payments and existing paid-meal receipt printing; historical requests match only a unique name plus normalized phone, and request-linked payouts are not counted twice.
- [x] Staff select vendors on the request link and paper meal entry; unknown public submissions remain for staff confirmation, and Procurement cannot clear meal/service requests without an attached account. Recipient snapshots and existing approval/payment powers remain unchanged.
- [x] Eight browser-rule/meal tests and rollback-only Finance identity checks passed for automatic linkage, duplicate creation, vendor-required reviews, immutable numbers, separated totals and anonymous denial; no test records retained. Actual component mobile history/dialog and public form visually checked; preview build clean.
- [ ] Verify real signed-in Finance entry → Procurement review → vendor history; external unmanaged Supabase provides no browser staff session, so controlled screenshots are not live end-to-end verification.

## Department document stamps
- [x] Prepare all six supplied stamps without their photographed dates; generate dates in Uganda time.
- [x] Apply department/business stamps to shared HTML/PDF prints and queued PDF reprints, recorded Operations/Supervisor approvals and Finance receipts; preserve signatures, payment evidence and verification footers.
- [x] Twenty-one date/department/receipt/issuance tests passed. Visually checked all six dated stamps, complete A4 meal receipt and A5 Finance receipt; removed photographed-date remnants and reserved stamp/QR space without clipping or overlap. Controlled sampling print preparation selects Quality even when its title is just an order number; no live payments or verification records written.
- [ ] Verify real signed-in department printing and receipt issuance — external unmanaged Supabase supplies no automated staff session; controlled layout checks are not authenticated end-to-end verification.

## Procurement meal-payment receipts
- [x] Add Print payment receipt to paid meal plans in Procurement review history; show the saved requisition number and separate recorded Admin/Finance signatures and stamps, using typed names when no exact signature is registered.
- [x] Deploy read-only receipt lookup restricted to active Procurement reviewers, Finance and administrators; require the exact successful/cash payment linked to the paid request. Five receipt tests and eight meal/issuance regressions passed; actual PDF builder visually checked with no clipping or overlap. Print preparation adds the current employee and verification QR; no funds, approvals or saved payments changed.
- [ ] Verify signed-in history → registered QR → printing — external Supabase supplies no automated staff session; authenticated issuance and browser print dialog remain unverified.

## Finance authorization errors
- [x] Authenticate both endpoints through verified claims and saved active-employee/Finance permissions; distinguish temporary permission-read failures from denial. Browser calls explicitly use the current session, refresh balances before reading, and show queue/history failures rather than false empty results. No payments or balances changed.
- [x] Seven access tests and ten sign-in/loan regressions passed; both services deployed, anonymous/invalid calls still rejected and preview build clean.
- [ ] Verify signed-in Finance balance refresh and provider lists — external Supabase supplies no automated staff session; real Finance browser check remained blank and authenticated success is unverified.

## Robusta price deductions
- [x] Checked quick and shared assessment calculators: G1/G2 affect outturn but not price; Less 12 deducts its full percentage; moisture deducts only above 15%. Screenshot's 10,900 reference and 4% deduction produce 10,464 correctly under the existing formula.
- [x] Applied above-14% Robusta moisture deductions in both calculators; 19 tests passed and quick-calculator example shows 15% moisture deducting 1%, with final 10,355 UGX/kg for screenshot readings. Saved assessments unchanged; real signed-in assessment saving unavailable on external unmanaged Supabase.
- [x] Applied excess-only G1 above 3% and G2 above 8%, each excess point deducting 1% of reference price, in quick and shared assessment calculators. All 22 tests passed; actual-component browser check confirms screenshot inputs yield 10% deduction / UGX 9,810/kg. Saved prices and rejection limits unchanged; signed-in assessment save remains unavailable on external unmanaged Supabase.

## Missing meal-plan and Procurement documents
- [x] MP-2026-000155 was issued/printed 12 November but has no submitted request or receipt; recent paid meal requests have saved receipts. Finance now shows issued-form and request status separately; Procurement lists issued forms and includes older non-paper meal requests with number search. No payments changed.
- [x] Five meal-rule tests and six live access checks passed; phone-sized actual-component examples show unsubmitted form and paid receipt correctly, preview build clean. New lookup warning resolved with private implementation/public invoker; 504 pre-existing linter findings untouched.
- [ ] Verify signed-in Finance/Procurement lookup with real saved records — external unmanaged Supabase provides no staff session; real route rendered blank, controlled component checks are not authenticated end-to-end verification.

## Finance receipt lookup
- [x] Add exact receipt/paper-number lookup in Finance History using saved issued PDFs, including provider request links; reprints use the shared printing-user and verification QR footer and reserve the print window on tap.
- [x] Phone-sized sample-data check passed for paper-number search, displaying the saved amount, verified-PDF viewer opening and clearing results on no match; preview build clean. Live reads found no MP-2026-000140 provider request or generated receipt, so that specific receipt cannot be printed from saved records.
- [ ] Verify signed-in Finance lookup and QR issuance with a real saved receipt — external unmanaged Supabase supplies no automated staff session.

## Internal administrator debits versus payouts
- [x] Preserve ADMIN_ADJUSTMENT on account-only debits even when using overdraft, so funds return to General instead of leaving the system; phone withdrawals remain external payouts.
- [x] Routing regressions passed in the correction migration and administrator operation deployed; preview build clean. Signed-in operation execution remains untested; no real payout sent.
- [x] Audited Benson's UGX 280,000 internal debit returning to General, superseding the previous separate-office-cash classification. Live read confirms General credited exactly UGX 280,000, original wallet debit remains -UGX 280,000 and Timothy's provider deduction remains -UGX 67,200; bank/provider balances and fees untouched.

## Quality posting waiting status
- [x] Distinguish confirmed delivery links from saved administrator review, keep review open after linking, and align waiting counts across Quality views without automatically approving old postings. Live reads found 11 reviewed, 377 pending (84 linked) and three pending scans sharing reviewed form numbers but different source files/deliveries; no decisions changed.
- [x] Add saved-decision read-back checks; six review/report regressions pass and preview build is clean.
- [ ] Verify real staff link → administrator review → refreshed queue — external unmanaged Supabase provides no browser session and the staff page did not render in the signed-out browser check.

## Treasury drift investigation
- [x] Prepare durable GosentePay receipts before payment, recover accepted bookkeeping without resending, serialize duplicate deductions, and record provider fees atomically. Sixteen handler/accounting/fee tests and rollback-only live fee/idempotency/privacy checks passed; payment services deployed.
- [x] Refresh drift from a single snapshot only after successful Yo sync, retain current figures in the existing alert and distinguish investigation from funding. Trusted monitor returned HTTP 200; recovered provider-confirmed missing UGX 35,000 and Timothy UGX 65,000 deductions plus fees, reducing drift from UGX 328,876 to UGX 228,876. Second live check recovered no payouts again and surfaced a temporary upstream connection timeout rather than inventing a new reconciliation figure.
- [x] Benson's earlier separate-office-cash confirmation was superseded by Fauza's explicit internal-debit confirmation: credited General UGX 280,000 without refunding his wallet or changing bank/provider money. Future real Finance/admin cash payouts still select the cash bucket.
- [ ] Reconcile remaining differences using a fresh successful provider refresh after Benson's UGX 280,000 internal correction; the earlier UGX 228,876 figure is now historical. Awaiting actual GosentePay balance evidence; tracked -UGX 2,152 is not a live provider balance. No arbitrary balancing adjustment or repayment sent.
- [ ] Verify a new real payout and the signed-in Treasury screen — external unmanaged Supabase provides no automated staff session; real-money tests were not sent.

## Treasury list filters
- [x] Put the Treasury movements and employee-account filters in a labelled panel and show the applied account, movement, reference, dates or search term as removable chips with Clear all; the chosen inputs stay highlighted and an empty list says it matched filters. Six filter-rule tests passed; preview build and typecheck clean.
- [ ] Verify real staff filtering on the signed-in Treasury page — external unmanaged Supabase supplies no automated staff session; the browser stops at the sign-in gate.

## Outlook lab reports on GRNs
- [x] Keep one saved-assessment summary on the GRN and print source/sample details and lab results on a separate accompanying analysis page, including bulk/queue output. Two-page browser check confirmed exact readings, unchanged prices and shared verification footer; nine regression tests passed. Real staff issuance remains blocked by external unmanaged authentication.
- [x] Restore secure Outlook collection with incoming-mail notifications and hourly reconciliation; live HTTP 200 extracted GAC QA 2611-0114, retaining its scan and delivery link and returning new readings for review.
- [x] Generate QR-stamped reports from reviewed linked postings; individual and bulk GRNs include separate lab readings without changing prices or assessments. GRN sample visibly checked; extraction/link and scanner tests passed, preview build clean.
- [ ] Verify real staff review → linked report → QR issuance/GRN printing — external unmanaged Supabase has no automated staff session; source PDF issuance is wired but authenticated printing remains unverified.

## Business-loan evaluation checks
- [x] Evaluate paginated saved wallet transactions and completed calendar-month tenure; block missing/future joining dates, absent transaction evidence and negative wallets. Debt/history read failures stop evaluation rather than imply clean history.
- [x] Preserve approval stages and product ceilings; retain existing risk reductions in the saved business maximum and enforce them after AI. Joining date and transaction totals appear in the evaluation and printed report. Six evidence-rule tests passed; function deployed and preview build clean; no funds moved.
- [ ] Verify real signed-in business-loan evaluation — external unmanaged Supabase supplies no automated staff session; live applicant evaluation remains unverified.

## Wallet account numbers
- [x] Display the signed-in user's name and large, copyable account number at the top of My Vault, even while the balance vault is locked; retain identity in other wallet views.
- [x] Assign immutable unique numbers to all 26 existing employee wallets and future wallets without changing ledger identities or balances.
- [x] Show names and numbers in wallets, transfer selection/confirmation, printed/PDF/CSV statements, HR balances and administrator support views; enable number search in transfers and account directories.
- [x] Recipient search test and rollback-only database checks passed for coverage, uniqueness, automatic assignment, immutable numbers and denied anonymous lookup; preview build clean. No test employee retained or funds moved.
- [ ] Verify real signed-in wallet → recipient selection → statement flow — external unmanaged Supabase provides no staff session; browser stops at the location-permission gate.

## Kelvis email and Benson withdrawal correction
- [x] Correct Kelvis Fauza's sign-in and employee email to kelvisfauza@gmail.com without changing account identity; Auth API succeeded and device email synchronized, unauthenticated correction rejected.
- [x] Screenshot identified Admin wallet operations: cancelled the failed unpaid 17:22 attempt after verifying no ledger/gateway activity and the matching completed 17:23 payment. Recorded cancellation audit; successful UGX 10,000 payout and fees untouched, no money resent/refunded. Signed-in queue rendering remains unverified on external Supabase.

## Admin-first employee per diem requests
- [x] Add Admin review under Requests with approval/rejection details; block unapproved awards at the saved-request boundary and prevent direct staff award inserts. Preserve Sunday reservations, printed numbers and historical awards.
- [x] Six approval-rule tests passed; rolled-back saved-request checks confirmed unapproved awards, self-approval and repeated approval are blocked, approval creates no award, and direct staff inserts/anonymous reviews are denied. No test requests or funds retained; preview build clean.
- [ ] Verify signed-in employee submit → Admin review → HR award — external unmanaged Supabase provides no automated staff session.

## Finance instant withdrawal history
- [x] Add searchable, paginated read-only history to Finance History and Withdrawals; show loading failures rather than false empty results. Two access/pagination tests passed and deployed endpoint rejects signed-out calls; preview build clean.
- [x] Isolated desktop/mobile history search, detail expansion and second-page navigation passed with no phone overflow; no payment action is offered.
- [ ] Verify signed-in Finance history with saved records — external unmanaged Supabase provides no staff session; isolated sample-data checks do not verify live staff access.

## Coffee assessment repair
- [x] Remove full-system integrity scans from save transactions; private queued checks stop after drain. Rolled-back insertion verified the reported 291 kg Robusta assessment at UGX 11,000 and its matching Finance lot; no real assessment retained. Surface actual save errors. Signed-in UI verification remains blocked by external unmanaged authentication.
- [x] Select the saved delivery's correct Arabica/Robusta calculator without changing either pricing formula; reset stale edit identity on new delivery selection.
- [x] Repair rejection error handling and offline payloads; 11 targeted regressions passed. Preserve actual save error messages for diagnosis.
- [ ] Verify a real signed-in assessment save — external Supabase has no automated staff session.

## Expired sign-in logout
- [x] Detect confirmed expired sign-ins across shared app requests; clear current-device access and show a sign-in notice without retrying actions or logging out for unrelated errors.
- [x] Five expiry/permission/request and error-explanation tests passed; latest preview compilation clean. Public sign-in route remained blank in browser, so real logout UI is not verified.
- [ ] Verify signed-in expiry to login end-to-end — external unmanaged Supabase has no automated staff session.

## Modern company display
- [x] Add rotating four-person staff showcases using saved names, roles, departments and signed portraits under existing access rules; replace repeated journey photos with seven distinct scenes and alternating editorial chapters. Actual /display navigation at 968×855 checked with no overflow or runtime errors; build clean.
- [ ] Verify real staff portraits on a signed-in display — external unmanaged Supabase supplies no automated staff session; signed-out display does not expose private employee records.
- [x] Load supplier rankings independently through a compact RLS-preserving database summary, without delivery-row truncation or overlapping refreshes; refresh every 30 seconds. Live aggregate checked against 4,576 deliveries and delayed-detail regression passed.
- [ ] Verify signed-in supplier ranking display with real staff access — external unmanaged Supabase supplies no automated session; actual public /display renders, but anonymous supplier access intentionally remains denied.
- [x] Refocus /display on 19 company/coffee-journey slides with two dedicated supplier-ranking pages; remove market commentary from this destination while keeping the separate price-display board.
- [x] Actual /display browser checks confirm journey and supplier showcase navigation; no invented ranking names when data is unavailable. Build clean. Authenticated supplier data read remains unverified.
- [x] Correct the actual /display inactivity destination to reuse the modern company presentation; remove its duplicate headers, documentary embeds and unavailable TradingView symbol. Verified actual /display in browser: intro, buying board, pause/next and no TradingView frames; build clean.
- [x] Refresh the existing TV display with a coffee-photo company introduction/closing, stronger company identity, simpler buying board, cleaner shared slide styling and play/pause/previous/next controls; retain prices, news, polling and WakeLock.
- [x] Browser-isolated company intro and buying board rendered; navigation/pause work and 902×855 view has no horizontal overflow. Preview build clean; normal signed-in route unavailable to automated checks.

## Real backup and recovery page
- [x] Connect Supabase backup management securely: verified eight completed physical backups; latest 11 November 02:15 UTC. App credential read returned HTTP 200.
- [x] Replace placeholders with verified history, refresh, coverage notices and guarded Super Admin restoration. Schedule read requires Enterprise (402); on-demand recovery point is unavailable (400); no invented incremental/download actions or paid upgrades.
- [x] Four authorization/recency/confirmation/error tests passed; unique audit claim prevents concurrent restore submission. No production restore or schedule change performed.
- [ ] Verify signed-in Backups page and recovery drill — external unmanaged Supabase has no browser session; production recovery requires an explicit separately authorized drill. Creation and schedule editing await Supabase-supported availability/plan.

## Settings problem resolution
- [x] Add administrator problem reporting, investigation/resolution notes and tracked email escalation to Fauza using existing ticket records; suspected code problems are clearly labelled as unconfirmed.
- [x] Provide safe connection/reload checks, existing red-flag checks and guarded payout/access/backup destinations; no automatic payment retries or balance changes.
- [x] Three rules tests passed; deployed endpoint rejects unauthenticated calls (401), existing table grants/policies checked, isolated desktop/mobile controls render without overflow, preview build clean.
- [ ] Verify real signed-in report → investigation → email escalation → resolution and red-flag checks — external unmanaged Supabase has no managed browser session; no live ticket or email was created for testing.

## Settings change email alerts
- [x] Capture committed changes across system settings and eight access/security/maintenance tables; unchanged saves produce no alerts and only changed field names are emailed.
- [x] Deploy email-only alerts to Fauza using the existing sender, private queue, leased claims, stable email idempotency keys, immediate dispatch and temporary five-minute retries removed after drain.
- [x] Three rules tests passed; rollback database tests verified actual/no-op capture and private worker permissions; unauthorized endpoint rejected. A harmless test setting produced a sent email at 08:19 UTC and was removed; no business policy or payment changed. Browser-origin saves remain unverified due to external authentication.

## Central system settings
- [x] Replace the long settings tabs with a searchable, categorized directory of 39 controls/destinations, loading only the selected control; advanced tools are separated.
- [x] Bring existing reminders and audit history into Settings and link payroll, pricing, forms, treasury and approval management without changing business rules; retain migration tools and do not expose loyalty re-enablement.
- [x] Preview build clean; isolated desktop/mobile directory, search, categories and advanced visibility verified with no mobile page overflow.
- [ ] Verify signed-in control loading and saved changes — external Supabase has no managed browser session; actual route stops at the location-permission gate. No live settings or financial records changed.
- [ ] Walk through every Settings control signed in and report load/save failures — requested 11 November; blocked by external unmanaged Supabase authentication. Signing into the preview does not supply an automated session; no live saves attempted and no individual failure confirmed.

## Restore original batching
- [x] Restore automatic daily stock linkage, including discretion purchases, without rebuilding existing batches or changing payments/sales.
- [x] Remove manual Batch Creation navigation and disable its creation action; rollback-only live tests passed for 237 kg automatic linkage, daily grouping, retry safety, discretion purchases and unchanged sales/payments; preview build clean.
- [ ] Verify signed-in Quality approval through the UI — external Supabase has no managed test session; automatic delivery-to-stock flow verified in rollback-only database tests instead.

## Loans in Admin Approvals
- [x] Add pending loan reviews to Admin Requests using the existing review/revision/payment workflow; fresh saved-loan checks and a private transition trigger block self/guarantor approval, missing required guarantees and unsigned terms.
- [x] Eleven loan/withdrawal rules tests passed; private trigger installed without caller execution grants and preview build clean; browser reached the location-permission screen.
- [ ] Verify signed-in administrator review and approval end-to-end — external Supabase has no managed browser session; no real loan approved or funds moved during testing.

## Coffee calculator rejection limits
- [x] Apply shared moisture 18%, Group 1 14%, Group 2 28%, Less 12 4%, and pods/husks/stones 4% each to Arabica/Robusta, admin and milling calculators, V2 assessment gating and training; remove combined 6% rejection, preserve price deductions and saved decisions.
- [x] All 33 concrete limit/boundary, combined-FM, price-deduction and saved-quality tests passed; latest preview build clean.
- [ ] Verify signed-in calculator saving through the real UI — external Supabase has no managed browser session; no historical assessments changed.

## Discretion-approved coffee stock
- [x] Correct future discretion purchases to enter stock atomically on approval; preserve rejected assessments and Finance state, serialize delivery/day linkage, and remove the separate client delivery update.
- [x] Audited repair of all 16 missing deliveries / 16,012 kg; each has matching linked stock, rejected quality preserved, no missing discretion sources remain, and Finance/sales/treasury snapshots stayed unchanged within the repair transaction.
- [x] Rollback-only live checks passed for exact stock contribution, retries, rejected quality, unchanged Finance/sales and invalid-price rollback; nine stock/receipt regression tests passed and preview build clean.
- [ ] Verify signed-in discretion approval through the real UI — external Supabase has no managed browser session.

## Supplier bank confirmation letter
- [x] Add the Bwambale James UGX 20,000,000 supplier-advance letter for Equity Bank Kasese Branch to Company Forms, using the supplied business-name registration certificate.
- [x] Rendered and visually checked the one-page PDF: correct header, certificate number/date, branch, account and signature spacing; no clipping or overlap. Preview build clean.
- [ ] Verify signed-in issuance/download — external Supabase session unavailable; browser stopped at the location-permission screen.

## Meal-plan approval visibility
- [x] Confirmed today's UGX 30,000 meal plan is pending with an approved Procurement review; authenticated table access and Fauza's administrator role are valid.
- [x] Move meal-plan/provider submissions to the default Admin Requests tab and report loading failures instead of showing an empty queue; approval and payment rules unchanged.
- [ ] Verify real signed-in administrator view — external Supabase has no managed browser session.

## Restore withdrawal charges
- [x] Restore tiered charges to approval-request Yo/Gosente/cash withdrawals; preserve bank charges and charge admin cash/bank withdrawals and first admin-wallet installments. Immediate failed approval payouts restore exact wallet and treasury movements.
- [x] Sixteen fee/handler tests passed; rollback-only database check verified UGX 30,000 + 1,100 charge and exact wallet/treasury restoration with no test rows retained; payment handlers deployed and latest build clean.
- [ ] Verify authenticated Finance withdrawal through the real UI — external Supabase has no managed test session; no live money sent. Legacy instant/approval partial-payment accounting requires a separate complete flow check.

## Withdrawal second-approver threshold
- [x] Raised the second-administrator rule for wallet withdrawals from above UGX 50,000 to above UGX 150,000; at or below 150,000 one Admin approves and the request goes to Finance. Non-withdrawal requests keep the 50,000 rule.
- [x] Five rule tests passed (55k/60k/72k/150k single Admin, 150,001/350k second Admin, expense 60k still two Admins) and latest preview build clean.
- [ ] Verify signed-in approvals screen — external Supabase session unavailable; confirm a sub-150k withdrawal shows a plain Approve button and reaches Finance on one approval.


## Failed Finance withdrawal wallet restoration
- [x] Confirmed the missed rollback; restore request-scoped wallet debits on Operations refusal and provider failures, including inherited retry debits, and surface lookup/restoration failures.
- [x] Seven isolated actual-handler tests passed and the payment function deployed; no real payout or historical wallet correction was performed.

## Banking-style Treasury workspace
- [x] Replaced the long Treasury page with six banking views: account directory, paginated/filterable movements, deposits, existing borrower profiles, employee salary/wallet profiles and provider reconciliation.
- [x] Reused existing loan applications/approvals, employee registration, payroll, advances, withdrawals, statements and overdraft workflows; removed duplicate legacy pool metrics, estimated investment returns and ledger replay/manual legacy adjustment controls from the page. No financial data or payment rules changed.
- [x] Six movement-handler/filter tests passed and preview build clean; isolated desktop layout confirmed six tabs and payroll links, without authenticated data.
- [ ] Verify signed-in account data, borrower profiles, deposits and payroll navigation — external Supabase session unavailable; actual route stopped at location-permission check. New standalone loan-profile creation is not implemented; existing borrower registration/application workflows are linked.

## Operations deduction reconciliation and movement visibility
- [x] Reconciled seven deductions into Operations: verified seven credits totaling UGX 38,000, balance UGX 2,276,501; original wallet debits retained and external destination labels corrected with audit metadata.
- [x] Restored authenticated read grant under existing admin-only RLS, labelled the account button Movements, and surfaced read errors with Retry; two handler tests passed and preview build clean.
- [ ] Verify real signed-in Treasury movements — external Supabase authentication unavailable; database results and handler tests verified instead.

## Milling monthly report printing
- [x] Reserve the print window during the click, keep it open for shared verification, avoid a duplicate QR footer, and report blocked popups or preparation errors.
- [x] Three actual-handler checks passed for synchronous opening, keeping the print window alive, and error/retry handling; latest preview build clean.
- [ ] Verify the real signed-in monthly report — external Supabase authentication unavailable.

## Finance GRN receipt mismatch
- [x] Lock payment confirmation to a deep-captured displayed lot, check saved identity/amount before writing, block repeated clicks, and enforce saved-payment identity in both receipt screens; six regression tests passed and preview build clean.
- [x] Compared saved lots/referrals/payments: 20260221018 has Musema's 15 October UGX 3,471,000 payment; today's Denis payment is UGX 3,471,000 on a separate lot under 20260222009, which also has an older UGX 3,738,000 paid lot. No payments changed.
- [x] Capture the saved payment and lot for post-payment printing so queue changes cannot replace its figures; reject unmatched or unconfirmed receipt payments. Three regression checks passed and preview build clean.
- [ ] Verify signed-in Finance payment/printing — external Supabase authentication unavailable; confirm with Finance which paper GRN Denis intended before any data correction.

## Per diem printed-form requests
- [x] Require an issued print-prepared per diem form number on employee submissions and show saved pending requests in HR awards; duplicate submission/award blocked and award plus treasury-backed wallet credit saved atomically.
- [x] Four reference/eligibility tests passed, database wrappers verified and latest preview build clean.
- [ ] Verify signed-in printing, submission and award — external Supabase session unavailable; browser stopped at the location-permission screen.

## SEO findings
- [x] Listed three stale failing findings and checked current source; fixed named menu, notification, vault and display controls and public headings.
- [x] Published route-aware titles/descriptions/canonicals and same-origin public sitemap; two visibility tests passed, browser metadata verified, latest build clean; metadata finding marked fixed pending rescan.
- [x] Linked Fauza’s Google Search Console, confirmed live verification tag and sitemap, verified ownership, added exact root property and submitted sitemap; setup finding marked fixed pending rescan.
- [ ] Complete sitewide heading/accessibility validation — authenticated pages cannot be checked with external Supabase; signed-out login, careers and support remained blank in browser. Composite content finding left failing rather than claiming full resolution.

## Misplaced GRN prints
- [x] Add authorized, audited revocation for chosen GRNs and restore Print/selection without changing payments; no existing GRNs reset automatically.
- [x] Three focused regression/security tests passed and latest preview build clean.
- [ ] Verify real signed-in revocation and printing — external Supabase authentication unavailable.

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
