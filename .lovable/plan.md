# Trainee (Intern) Account with Guided Walkthrough

A new **Trainee** role for interns: read-only everywhere, sensitive figures hidden, and an automatic step-by-step tour that walks them through the real screens, department by department (Store → Quality → Procurement → Finance → Inventory → Sales → EUDR).

## What the trainee experiences

1. **First login** — a welcome card appears and the tour starts automatically. Each step highlights a real part of the screen (a menu, a tab, a table) with a short explanation and Next / Back / Skip buttons and a progress bar ("Step 4 of 28 · Quality").
2. **Moving between departments** — the tour opens the next department page by itself; the intern just reads and clicks Next.
3. **Resume anywhere** — progress is saved per intern. If they log out mid-way, the tour picks up where they stopped. A "Training Guide" button in the header lets them restart or jump to any department.
4. **Finish** — a completion screen summarises what they covered; after that the tour no longer auto-starts but stays available from the button.

## What a trainee can and cannot do

Allowed: browse the seven training departments, use search and filters, open records, see weights/kilograms, dates, suppliers' names, grades, moisture, statuses, batch codes.

Blocked (with a polite "Training account is view-only" notice):
- Adding, editing, deleting, approving, saving, uploading, submitting any form
- Typing into any input field (search/filter boxes stay usable)
- Printing, exporting, downloading, sharing, copying data (including Ctrl+P / Ctrl+S)
- Opening Reports, Settings (other than viewing their own profile), Approvals, Treasury, HR, Wallet/Loans, IT

Hidden figures (shown as "UGX ••••"):
- Paid price and price per kg, GRN payment amounts, advances, contract values
- Suggested/final quality prices and the pricing calculator results
- Sales prices and revenue, customer invoice totals
- Salaries, wallet balances, loyalty points, treasury balances
- Bank account numbers and mobile-money numbers

Suggested extra items to hide (included unless you say otherwise):
- Supplier and customer **phone numbers** (shown as 07•• ••• •••)
- Employee personal details (national ID, date of birth, home address)
- The wallet dock and money-related pop-ups (deposits, withdrawals, loans, invest & earn)
- Announcements marked confidential / management-only

## Creating trainee accounts (admins)

- "Trainee" appears in the role picker when adding or editing an employee (HR Add Employee, Settings Add/Edit User, Permission Manager).
- Choosing Trainee automatically sets the department to "Training" and the view-only module list; admins cannot grant extra permissions to a trainee.
- A small **Trainee Progress** card on the HR page lists each intern, their current step and completion date.

## Technical details

**Role & permissions**
- `employees.role = 'Trainee'`; permissions fixed to the seven training modules (`Store Management`, `Quality Control`, `Procurement`, `Finance`, `Inventory`, `Sales Marketing`, `EUDR Documentation`).
- `AuthContext.canPerformAction`: Trainee → only `view`. New `isTrainee()` helper. `useRolePermissions` / `useRoleBasedAccess` derive from it, so existing hide/show buttons follow.
- `ProtectedRoute`: trainees redirected to `/` for any route outside the training whitelist (Reports, Settings sub-tabs, Approvals, HR, admin, wallet, loans, IT).
- Sidebar (`AppSidebar`, `MobileNavigation`): trainee-specific menu with only the seven departments plus "Training Guide".

**Enforcement** — new `src/hooks/useTraineeMode.ts` + `src/components/trainee/TraineeEnforcer.tsx` (mounted next to `ITReadOnlyEnforcer` in `App.tsx`), modelled on the IT read-only enforcer but active on every route:
- Capture-phase click interception for mutating/output buttons and menu items; form `submit` blocked; `beforeinput`/paste blocked on inputs unless the field is a search/filter (`type=search`, placeholder/aria-label containing search/filter, or `data-trainee-allow`).
- `window.print`, `navigator.share`, clipboard copy and Ctrl/Cmd+P/S intercepted.
- Hides `V2WalletDock`, money modals and announcement popups when trainee.

**Sensitive-data masking** — `src/components/trainee/TraineeMasker.tsx`:
- A `MutationObserver` over `document.body` that rewrites text nodes matching currency patterns (`UGX`, `USh`, `Shs`, `/kg` amounts) and labelled money fields (price, amount, total, paid, balance, salary, cost, value) to `UGX ••••`; phone patterns (`07xx…`, `+256…`) to masked form; national-ID/DOB cells via `data-sensitive` attributes added to the relevant table cells.
- Processed nodes are tagged to avoid re-processing loops; charts with money axes are covered with a "Hidden for training" overlay via `data-sensitive="chart"`.
- Server side: trainees are not given Finance/HR write policies (RLS already scopes writes to roles/permissions); no new tables exposed.

**Guided tour** — no external library (none installed); lightweight custom implementation:
- `src/components/trainee/TraineeTour.tsx`: spotlight overlay (SVG mask around the target's bounding box), floating step card, keyboard navigation, auto-scroll to target, route change via `useNavigate` when a step lives on another page, graceful centred card when a target is not found.
- `src/components/trainee/curriculum.ts`: ordered steps grouped by department, each with `route`, `target` (CSS selector, mostly new `data-tour="..."` attributes added to headers, tabs and tables on `/store`, `/quality-control`, `/procurement`, `/finance`, `/inventory`, `/sales-marketing`, `/eudr-documentation`), `title`, `body`. Roughly 4–6 steps per department covering: what the department does, how a coffee delivery is received and weighed, how quality grades it, how procurement/finance handle payment (without figures), how stock batches form and deplete on sale, and how EUDR batches are documented and traced.
- Header button "Training Guide" (trainees only) to restart / jump to a department.

**Progress tracking** — new table `public.trainee_progress` (`employee_id`, `current_step`, `completed_steps int[]`, `started_at`, `completed_at`, `updated_at`) with grants, RLS (trainee reads/updates own row via `get_unified_user_id`; admins/HR read all), plus `localStorage` cache for instant resume. Hook `useTraineeProgress.ts`.

**Account creation**
- Add `Trainee` to role enums/pickers in `AddEmployeeModal`, `UserCreationForm`, `AddUserForm`, `EditUserForm`, `EmployeeDetailsModal`, `UnifiedPermissionManager`; picking it locks department to "Training" and permissions to the training set.
- Existing `create-user-account` edge function is reused unchanged.
- Memory file `mem/access-control/trainee-role.md` documenting the rules.
