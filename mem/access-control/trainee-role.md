---
name: Trainee (intern) role
description: View-only Trainee account for interns with masked money figures, restricted menus and an automatic guided tour through the seven operational departments
type: feature
---
- Role string `Trainee` (also matches intern/internee). Department is forced to `Training`; permissions locked to Store Management, Quality Control, Procurement, Finance, Inventory, Sales Marketing, EUDR Documentation. Admins cannot grant extra permissions.
- Strictly view-only: no add/edit/delete/approve/save/upload/submit, no typing except search/filter boxes, no print/export/download/share/copy (incl. Ctrl+P/S). Blocked actions show "Training account is view-only".
- Allowed pages only: the seven departments (legacy + /v2 routes) and dashboard; everything else redirects to `/`. Reports, Settings, Approvals, Treasury, HR, Wallet/Loans, IT, chat, notifications, wallet dock and money pop-ups hidden.
- Money masked on screen ("UGX ••••"): prices, payments, advances, contract values, salaries, wallet/treasury balances, loyalty points, revenue. Phone numbers masked. Weights, dates, supplier names, grades, moisture, statuses, batch codes stay visible.
- Guided tour auto-starts on first login and resumes where the intern stopped (`trainee_progress` table, one row per employee). Order: Welcome → Store → Quality → Procurement → Finance → Inventory → Sales → EUDR → Finish. "Training Guide" header button restarts or jumps by department. HR › Create tab shows a Trainee Progress card.
- Do not set `employees.is_training_account` for trainees — that flag drives the older generic TrainingTour, which is disabled for Trainee accounts to avoid two tours.
