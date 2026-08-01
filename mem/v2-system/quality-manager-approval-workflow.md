---
name: Quality Manager Approval Workflow
description: Quality personnel submit assessments/prices to the Head of Quality (role "Quality Manager") for approval before admin pricing; role-gated quality tabs
type: feature
---
- Role split via `useQualityRole()`: `isQualityHead` = employee.role "Quality Manager" (or Super Admin / Administrator / Manager).
- Quality personnel assessments save with status `pending_quality_manager` (submitted price kept in `qm_original_price`). Head of Quality submissions go straight to `pending_admin_pricing`.
- Head of Quality reviews in Quality Department > **Approvals** tab: approve, adjust price, or reject.
  - Approve/adjust -> status `pending_admin_pricing` (normal admin pricing -> finance flow continues).
  - Reject -> assessment status `rejected`, coffee_record back to `pending` for re-assessment.
- Every review is logged in `quality_manager_approvals` (batch, action, reviewer, original vs approved price, notes) and on the assessment (`qm_reviewed_by/at`, `qm_action`, `qm_notes`).
- Head-only tabs: Approvals, History, Analytics, Reports, Recommendations, Performance. GRN print/reprint/bulk print is head-only.