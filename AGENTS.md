# Project architecture

- TV supplier totals use the security-definer display_supplier_summary RPC with independent reads.

- Read backup protection through an authenticated administrator-only Supabase Management connector; production restore requires fresh Super Admin sign-in, exact backup confirmation and a unique submitted audit claim, and never auto-retries uncertain outcomes. Provider-unavailable creation/schedule/download actions remain unavailable rather than simulated.

- Track Settings problems in existing system_settings-source support tickets through an authenticated administrator endpoint; recovery only reloads/diagnoses or opens guarded workflows, while code classifications remain provisional and escalation delivery must be confirmed.

- Capture committed settings/access changes into a private alert outbox with field names only; wake the authenticated email worker on enqueue, use idempotent delivery and leased claims, and remove retry scheduling after drain so routine alerts do not depend on browser state.

- Keep System Settings as a searchable catalog of lazily opened existing controls and guarded management links; reuse authoritative settings consumers rather than exposing arbitrary JSON edits or duplicating financial/security policies.

- Embed the pending loan queue in Admin Requests through QuickLoans approvalDesk mode to reuse the existing review/revision/payment workflow; enforce borrower/guarantor conflicts and signed guarantor/borrower prerequisites at the loan transition boundary, preserving separate service-driven appeals and historical loans.

- Keep coffee rejection decisions in coffeeRejectionRules shared by pricing calculators, assessment gating and training; preserve independent price deduction formulas and saved historical decisions when limits change.

- Inventory-ready deliveries link atomically and idempotently to daily coffee-type batches through ensure_inventory_batch_source_for_record, including discretion purchases; preserve existing sources and sales allocations without full rebuilds, and keep supplier payments independent of batching.

- Keep supplier bank confirmation PDF content in a dedicated builder, using the supplied business-name certificate independently of company incorporation branding; prepare shared issuance verification before offering the browser download.

- Display pending provider submissions (including meal plans) in the default Admin Requests tab using the existing approval component; retain Procurement gating and surface read failures rather than showing a false empty queue.

- Staff approval-request withdrawal principal inserts atomically issue a separate tiered fee through the ledger trigger; deleting a failed request-scoped debit reverses its exact treasury entries and linked fee, preventing partial charges and double Operations draws. All withdrawal channels share the service-charge tiers; provider costs remain separate.

- Failed approval-request payouts restore their request-scoped wallet debit on both treasury refusal and provider failure, including debits inherited from earlier attempts; report restoration errors so an unpaid withdrawal cannot silently consume wallet funds.

- Treasury account movements use direct reads under the existing administrator-only RLS policy with explicit authenticated SELECT grants; surface read failures instead of displaying a misleading empty history.
- Organize Treasury as a tabbed operations workspace over authoritative treasury_accounts and treasury_account_entries; link or embed existing loan, payroll and wallet workflows without duplicating balances, changing approval rules or treating internal account movements as external bank transfers.

- Milling monthly reports reserve their print window synchronously in the click and leave verification, the single printed-by/QR footer, and dismissal to the shared print handler, avoiding blocked popups and closing before verification completes.

- Bind GRN confirmation and post-payment printing to deep-captured lot snapshots, validating the displayed and freshly saved lot identity/figures before payment; enforce saved-payment-to-lot binding in both receipt screens and count only confirmed same-lot payments so queue changes cannot replace receipt figures.

- Issue employee per diem forms as immutable saved request snapshots; employees submit their own print-prepared number once, and Admin/HR awards atomically record the award plus a PER_DIEM wallet credit through existing treasury triggers to prevent duplicate or partial payments.

- Manage route titles, descriptions and self-referencing canonicals through one Helmet provider and RouteMetadata, preserving static social fallback tags; keep sensitive document/employee and staff routes noindex and out of the static public sitemap.

- Revoke misplaced Finance GRN print state through a permission-checked private routine and public invoker wrapper, archiving every removed active print row in audit_logs; match lot and batch records so selection resets without changing payments or Quality assessments.

- Procurement analytics groups paginated saved Store deliveries by the current Kampala calendar week and weights uniquely linked saved buying prices by priced kilograms; reference prices come only from saved market_prices, with no fabricated defaults, trends, controls or implied payment completion.

- Procurement delivery quality comes only from explicitly linked saved assessments or a unique legacy batch-only match; show missing values as empty and label saved unit prices per kilogram so fabricated defaults and bag-unit confusion cannot misstate purchases.

- Issue paper meal-plan numbers in a Procurement-only registry, submit each once through provider requests and preserve the cash/mobile-money choice and recipient number across full and partial releases; use the shared PDF verification footer so handwritten offline forms remain traceable without bypassing normal approvals. Bulk printing reserves its window before asynchronous issuance and opens a verified PDF with an automatic print action instead of downloading only.

- Resolve sampling pickup notifications from authenticated saved orders and employee phone records in notify-sampling-order; use the shared SMS sender with per-order recipient references so caller-supplied names cannot redirect pickup alerts.

- Share Store delivery sampling and batch reservation across V1/V2 intake; persist sample choice with a trigger-validated supplier order and atomic order linkage, including queued offline receipts, so attachment failures cannot leave a partially linked delivery. Delivery numbers are reserved during entry and remain distinct from stock batches created after inventory promotion.

- Store managers propose new suppliers through pending_supplier_requests (optionally linked to a coffee delivery); only admins/Procurement confirm or decline via supplier_requests_private RPCs, and declining re-points the linked delivery at the chosen real supplier. Direct supplier inserts stay Procurement/admin-only.
- Store clearance and delivery notes share a persisted dispatch snapshot with trigger-issued immutable numbers and server-validated inventory batch lines. Store renders creation and current-session printing only; saved clearances enter a realtime Procurement confirmation queue for a buyer contract or spot sale, confirmed through a permission-checked private routine. Procurement explicitly maps a destination/branch label to an available saved contract without requiring identical buyer text; preserve the dispatch snapshot and signed attachments. Sales retains history, comparisons and existing-sale attachment without creating sales or deducting inventory; paired PDFs use the registered print footer.

- Embed the shared SamplingOrdersTab in both V1 and V2 Store pages, preserving its existing creation checks, so Store staff can use sampling orders without entering Quality Control.

- Restore sale stock from recorded allocations in database triggers on deletion/cancellation/stock-field edits; lock sale and batch rows and cap repeated deduction calls by outstanding sale weight, so every client shares atomic, idempotent stock accounting. Confirm returned deleted rows before reporting success; preserve reversals and source snapshots in the audit trail.

- Issue print verification before browser printing, PDF serialization, and Word packing; resolve the employee name from the authenticated account and add a registered QR footer, reserving space rather than covering original content. Queue reprints identify the current printing employee; verification confirms issuance, not payment, approval, or later edits.
- Resolve numbered form verification through the public verification RPC against issued-number registries with space/hyphen normalization; expose issuance-only metadata and prioritize registered verification status so existing printed forms work without revealing assessment data.

- Collect Outlook quality postings through a bounded, database-leased attachment recognizer with immutable deduplication and private files; mailbox events collect arrivals, recent-mail reconciliation has a separate cursor from hourly historical scanning and subscription renewal. Link only unique exact references automatically; date/supplier candidates require administrator confirmation through permission-checked private-schema routines without changing original assessments or deliveries.

- Detect system integrity red flags from explicit record links via change-triggered scans, keep privileged processing in a non-exposed schema, and resolve tasks only when their source issue disappears; administrators claim and annotate tasks without altering source records.
 
- Normalize legacy station-based price SMS at the sending boundary, queue and resender using the shared compact-price-sms helper; preserve original station amounts rather than replacing them with later saved prices, so older installed clients cannot send duplicate buying/reference blocks.

- Keep V1 batch details read-only, linking quality to original deliveries and sales to batch allocations; show recorded quality ranges and value remaining stock only when all batch kilograms have a saved buying cost, so the view does not imply verified payment or unrecorded dispatch.

- Generate Quality daily-price sheets from freshly fetched saved reference prices, registering an immutable verification snapshot before issuing the A4 PDF, so QR scans identify the printed values rather than later price changes.

- Keep V1 desktop/mobile and V2 navigation grouping aligned while preserving existing route paths and permission guards, so menu organization does not change access rights or bookmarked links.
- Temporarily pause My Deductions by rendering an unavailable page at its existing route rather than changing deductions data, so direct links remain safe and the feature can be restored later.
- Package Android with Capacitor's bundled web assets instead of a remote preview URL, so installed copies do not depend on a temporary development site. Build the app bundle with `CAPACITOR_BUILD=true npm run build` (sets Vite base to './'); the normal web build keeps base '/' so deep links refresh correctly.- Record part payments for any Finance-stage payment through the finance-partial-payment function and the partial_payments tables, finalizing the source item only when the balance reaches zero, so each flow keeps a single paid/balance record and cannot be paid twice.
- Bounced GosentePay payouts restore their exact recorded amount + fee to the tracked GosentePay balance via gosentepay_reverse_payout (service-role only, idempotent per reference), triggered by provider-confirmed callbacks and the payout poller's 48h re-check; Yo needs no tracking because its balance is synced live.
- Staff wallet withdrawals leave only via the user_wallets debit; disburse-approval-request must not also draw Operations.
- Provider/bank charges leave treasury with the payout: GosentePay fees debit Operations via trigger (returned on bounce); bank charges post against Cash at Bank.
- Coffee integrity flags join the existing scanner via a private view; admins fix them only through audited resolve_coffee_flag, which never deletes paid entries.
