# Loan Evaluation Appeal System

When the evaluator denies a loan or offers less than the user requested, the user can file an appeal. The appeal goes to admins, who review the full evaluation report and either uphold, approve, or counter-offer. Any decision requires **3 admin sign-offs with written reasons** before it takes effect.

## User Flow

1. User submits loan request → evaluator returns `denied` or `reduced` (amount < requested).
2. UI shows a banner: *"Not what you expected? Appeal to admin"* with a button.
3. User opens appeal form:
   - Requested amount (prefilled, locked)
   - Offered amount (prefilled, locked)
   - Evaluation reasons (read-only summary)
   - **Justification** (required, min 30 chars): why they deserve more / why the denial is wrong
   - Optional supporting note (e.g. "I have a side income of X")
4. Submit → creates a `loan_appeals` row, status `pending_admin_review`.
5. User sees appeal status on their loans page (Pending → Under Review → Decided).

## Admin Flow

New tab in Loans Management: **Appeals**.
Each appeal card shows:
- Borrower name, dept, salary, requested vs offered amounts, loan type, term
- Full evaluation report (risk signals, history summary, recommended amount, denial reasons)
- User's justification
- Three decision actions:
  - **Uphold evaluation** (denial stands / offered amount stands)
  - **Approve requested amount in full**
  - **Counter-offer** (custom amount + custom term)
- Each admin must attach a written reason (min 20 chars) with their vote.

Voting rules:
- Need **3 distinct admin votes** for the same decision (same amount/term if counter-offer; same uphold/approve outcome otherwise).
- An admin can only vote once per appeal.
- Borrower's own line manager / department head cannot vote (separation of duties — reuses existing SOD pattern).
- Once 3 matching votes are collected, decision auto-executes:
  - **Approve / Counter-offer** → creates the loan at the agreed amount/term, disburses to wallet (bypasses re-evaluation), audit trail references the appeal.
  - **Uphold** → appeal closes as `denied_on_appeal`, user notified.
- If admins vote differently (e.g. 1 uphold, 1 approve, 1 counter), nothing happens until 3 align. Show vote tally on the card.
- Appeals auto-expire after 7 days with no 3-vote consensus → status `expired`, user can refile once.

## Notifications

- On appeal submission: email all admins with permission to review, CC operations.
- On each admin vote: email borrower ("1 of 3 admins reviewed").
- On final decision: email borrower + CC operations with outcome + all 3 reasons.

## Technical Details

### New table: `loan_appeals`
- `loan_evaluation_id` (FK to `loan_evaluations`)
- `user_id`, `requested_amount`, `offered_amount`, `loan_type`, `term_months`
- `justification` (text)
- `status` ('pending_admin_review' | 'decided_approve' | 'decided_uphold' | 'decided_counter' | 'expired')
- `final_amount`, `final_term_months` (null until decided)
- `resulting_loan_id` (FK to `loans`, null until disbursed)
- `decided_at`, timestamps
- RLS: borrower can read own; admins (via `has_role`) can read/update all.

### New table: `loan_appeal_votes`
- `appeal_id` (FK)
- `admin_id` (auth.uid())
- `vote_type` ('uphold' | 'approve_full' | 'counter')
- `counter_amount`, `counter_term_months` (null unless `counter`)
- `reason` (text, required)
- UNIQUE(appeal_id, admin_id) — one vote per admin.
- RLS: admins read all; insert their own only.

### DB function: `tally_loan_appeal_votes(appeal_id)`
- Counts matching votes. If 3 align on the same decision (and same counter amount/term if applicable), updates `loan_appeals.status` and `final_amount`, then calls existing loan-creation RPC to disburse.
- Trigger on `loan_appeal_votes` insert calls this function.

### Edge function updates
- `loan-evaluation`: when returning `denied`/`reduced`, include `appeal_eligible: true` and `evaluation_id` in response.
- New edge function `loan-appeal-decide` (optional) — only needed if we want server-side validation of admin role + SOD check before insert. Otherwise enforce via RLS + trigger.

### Frontend
- `QuickLoans.tsx`: after evaluation, show appeal banner + dialog if `appeal_eligible`.
- New page `src/pages/admin/LoanAppeals.tsx`: list pending appeals, card per appeal, vote dialog.
- Add nav entry under Loans Management for admins.
- Notification integration: reuse existing email infrastructure with operations CC.

### Cron
- Daily job to expire appeals older than 7 days with <3 matching votes.

## Open Questions

1. **Counter-offer matching**: must all 3 counter votes agree on the exact same amount, or take the median/lowest? Strictest = exact match.
2. **Can admins change their vote** within the 7-day window? (Recommend: yes, until decision executes.)
3. Should the borrower see admin names + reasons on the final decision email, or just the outcome?
