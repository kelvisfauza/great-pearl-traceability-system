# Finance releases money after Admin approval

## The new flow

```text
Staff request -> Admin approves (1 or 2 admins) -> "Waiting for Finance" -> Kibaba releases -> money goes out
                                                                        \-> Kibaba returns / rejects (wallet unfrozen)
```

The admin no longer sends money. Admin approval moves the request to Finance, and money leaves only when Finance presses **Release**.

What this covers:
- **Withdrawals** (mobile money, cash, bank)
- **Requisitions** (cash requisition forms)
- **Requests over UGX 50,000**, which already wait for Finance and stay as they are

Unchanged:
- Salary advances, salaries, instant withdrawals and loyalty credits stay automatic.
- Supplier coffee payments (GRN) already belong to Finance.

Safety rules:
- Finance can't release their own request, and the admin who approved it can't release it either.
- The money stays held from the wallet while it waits for Finance, so it can't be spent twice.
- If Finance rejects, the held money goes back to the wallet and the person gets a text.
- A request waiting more than 24 hours sends Finance and the admin a reminder.

## Finance V1 (the /finance page)

- The "Withdrawal Requests" section becomes the **release queue**. It lists everything admins approved: withdrawals and requisitions, with the requester, amount, channel, phone and who approved it.
- Each row has three buttons:
  - **Release via GosentePay/Yo:** sends the mobile money and shows success or failure.
  - **Pay cash:** records a voucher number and marks the request paid.
  - **Reject:** asks for a reason and returns the money to the wallet.
- The existing "failed payouts – retry" list stays under the queue.
- The old wording "approved by Finance, now pending Admin" changes to the right order: "released by Finance".

## Finance V2 (the /v2/finance dashboard)

- New **"Release Payments"** tab next to Pending Payments. It uses the same queue and buttons as V1, so both pages always show the same list. Releasing in one removes the item from the other straight away.
- The Overview "Pending Approvals" count includes this queue, plus a badge showing the total UGX waiting.

## Admin side

- On final admin approval, the status becomes "Waiting for Finance" instead of paying out. The admin sees a note saying Finance will release it.
- The requester gets a text: "Approved by Admin, Finance will release your payment."
- Kibaba gets a text and email alert for each item waiting.

## Technical details

- In `useUnifiedApprovalRequests.ts`, the withdrawal branch's final approval sets `status='pending_finance'` and `approval_stage='pending_finance'`, with no payout call. The requisition branch goes to `pending_finance` instead of auto-finance.
- Build a shared `FinanceReleaseQueue` component, used by V1 (`WithdrawalRequestsManager`) and V2 (a new tab). The payout logic moves out of the admin hook into it. `handleApprove` becomes the release: it does the payout and sets `status='approved'`, `finance_approved*` and `payout_status`.
- Add a database trigger on `approval_requests` that blocks `finance_approved=true` when the finance user is the requester or an admin approver, and allows only Finance/Super Admin roles to do it.
- Reuse the existing refund-on-reject path. Everything else keeps the current lowercase statuses and treasury routing.
- Test once with a small withdrawal: admin approves, Kibaba releases, and the payout goes through.
