# Quotations — submit, procurement review, management approval

A new **Quotations** area where a supplier/company quotation is captured with its PDF, reviewed by procurement, then approved by management. Procurement and admins can open the attached document, and replies go out to the company by email or text.

## What you get

**1. Add a quotation**
- Contact person / company name, email, phone
- Subject, amount (optional), currency, notes
- Attach the quotation file (PDF, Word or photo, up to 10MB)

**2. Procurement review**
- List of quotations waiting for review, with the attached document viewable inline
- Actions: **Recommend for approval**, **Request revision**, **Reject** — each with a note
- After the decision, a message box lets procurement reply to the company:
  - by **email** (branded message with the note)
  - by **text message** via BulkSMS
  - or both
- Every reply is logged against the quotation with who sent it and when

**3. Management approval**
- A "Quotations awaiting approval" section on the Approvals page
- Managers see the full quotation, the attached PDF, and procurement's recommendation and notes
- **Approve** or **Reject** with a note; the company can be notified the same way

**4. Status trail**
Submitted → Under procurement review → Revision requested / Recommended → Approved / Rejected. Full history of decisions and messages on each quotation.

## Who can do what
- Add a quotation: procurement staff and admins
- Review: procurement (Timothy and procurement permission holders) and admins
- Final approval: Administrator, Super Admin, Managing Director
- View the attached file: procurement and admins only (private storage, time-limited links)

## Technical notes

- **Tables**: `public.quotations` (company_name, contact_name, email, phone, subject, amount, currency, notes, file_path, file_name, status, submitted_by/_email, procurement_decision + notes + by/at, approval_decision + notes + by/at, timestamps) and `public.quotation_messages` (quotation_id, channel `email|sms`, direction, subject, body, sent_by, delivery status/counts, created_at). RLS: read/insert for authenticated staff, updates restricted to procurement/admin via existing role helpers; `GRANT` blocks for `authenticated` and `service_role`; `update_updated_at_column` triggers.
- **Storage**: new private bucket `quotations`; RLS policies on `storage.objects` limiting access to authenticated staff; signed URLs for viewing, reusing the pattern in `ContractPdfViewer.tsx`.
- **Edge function** `quotation-notify`: validates the caller's session and role, loads the quotation, sends email through `send-transactional-email` (`general-notification`, `recipientEmail`) and SMS through `send-sms` with a new `messageType: 'quotation_reply'` routed over BulkSMS premium (added to the premium list in `send-sms/index.ts`), normalises phones to `0XXXXXXXXX`, logs the result in `quotation_messages`.
- **Frontend**:
  - `src/hooks/useQuotations.ts` — fetch, create, review, approve, notify
  - `src/components/quotations/QuotationFormDialog.tsx` — capture + upload
  - `src/components/quotations/QuotationViewer.tsx` — signed-URL inline preview (generalised from `ContractPdfViewer`)
  - `src/components/quotations/QuotationReviewPanel.tsx` — procurement queue with decisions and reply box
  - `src/components/quotations/QuotationApprovals.tsx` — management section added to `src/pages/Approvals.tsx`
  - New **Quotations** tab in the V2 Procurement dashboard (`src/pages/v2/procurement/Dashboard.tsx`) and a sidebar entry
