# Admin can adjust loan terms before approving

Today an admin reviewing a loan can only Approve, Reject, or send a Counter Offer on the amount. This adds a proper "Adjust terms" step where the admin can change the months (and amount), see the new installments and interest recalculated instantly, and send it to the applicant to sign before final approval. Admins who don't need to change anything keep approving in one click exactly as now.

## How it will work

1. **Admin review screen** gets an "Adjust terms" button next to Approve / Reject.
2. Opening it shows editable fields: **loan amount**, **duration (months)**, and **repayment frequency**. As the admin types, the screen recalculates and previews: total interest, total repayable, installment amount, number of installments, and the full new repayment schedule side by side with the original.
3. The admin adds a short note explaining the change and clicks **Send to applicant for signing**. The loan moves to a "Revised — awaiting applicant signature" state; it no longer sits in the admin approve queue.
4. The applicant is notified (SMS + the loan card on their Quick Loans page) and opens **Review & sign revised terms** — the same loan agreement form they signed at application, regenerated with the new figures. They type their name as signature and accept, or decline the revision.
5. On signing, the loan is updated with the new amount, duration, interest, total repayable and installment, the new signature and terms version are stored, and it returns to the admin as **pending approval (revision signed)** with a clear badge.
6. The admin then does the normal full approval and disbursement; the approval generates installments from the revised figures (the existing approval code already builds the schedule from the loan record, so no change needed there).
7. Declining puts the loan back to the admin with a "revision declined" note, so the admin can approve the original, adjust again, or reject.

Interest is recalculated using the existing rules for each loan type (monthly rate, interest cap, bullet/weekly/monthly frequency), so revised loans follow the same maths as new applications. Pure salary loans keep their half-salary installment rule when the duration changes.

## Technical notes

- Migration on `public.loans`: `revision_amount`, `revision_duration_months`, `revision_frequency`, `revision_total_repayable`, `revision_installment`, `revision_note`, `revision_by`, `revision_at`, `revision_signed_at`, `revision_signature`, `revision_terms_version`, `revision_declined_reason`. New status value `revision_pending_signature`.
- `src/components/loans/LoanReviewModal.tsx`: new "Adjust terms" panel with live recompute (reusing `LOAN_TYPE_CONFIG`, `getCappedInterest`, `getLoanSchedule` — these move from `QuickLoans.tsx` into a shared `src/lib/loanMath.ts` so both admin and borrower paths use one implementation), preview schedule table, and an `onReviseTerms(loanId, revision)` callback.
- `src/pages/QuickLoans.tsx`: handler writing the revision and setting status `revision_pending_signature` + SMS to applicant; borrower section renders a "Revised terms — signature required" card opening `LoanTermsDialog` prefilled with revised figures; accept applies the revision to the loan and returns status `pending_admin` with `revision_signed_at`; decline returns it with a reason. Admin list/badges and `LoanDetailsDialog` show the revision fields and the signed-revision badge.
- Existing counter-offer flow is left untouched.
