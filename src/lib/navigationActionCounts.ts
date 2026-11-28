export type ActionRow = { id: string; status?: string | null; type?: string | null; title?: string | null; request_type?: string | null; meal_correction_pending?: boolean; payout_status?: string | null; details?: unknown };
export type ReviewRow = { source_table: string; record_id: string; decision: string };
export const statusKey = (value?: string | null) => (value || '').toLowerCase().replace(/\s+/g, '_');
const adminStatuses = new Set(['pending', 'pending_admin', 'pending_admin_approval', 'pending_admin_2', 'pending_admin_3', 'pending_approval', 'finance_approved']);
const financeStatuses = new Set(['pending_finance', 'admin_approved']);
const reviewStatuses = new Set([...adminStatuses, ...financeStatuses]);
const isLeave = (r: ActionRow) => statusKey(r.type) === 'leave';
const isWithdrawal = (r: ActionRow) => /withdraw|failed payout|retry/i.test(`${r.type || ''} ${r.request_type || ''} ${r.title || ''}`);
const unique = (rows: ActionRow[]) => [...new Map(rows.map(r => [r.id, r])).values()];

/** Counts are queue items, never payments, totals or duplicate references. */
export function requestActionCounts(approvals: ActionRow[], providers: ActionRow[], reviews: ReviewRow[], today: string) {
  const decisions = new Map(reviews.map(r => [`${r.source_table}:${r.record_id}`, statusKey(r.decision)]));
  const needsReview = (table: string, id: string) => {
    const decision = decisions.get(`${table}:${id}`);
    return !decision || decision === 'pending' || decision === 'returned';
  };
  const requests = unique(approvals);
  const submissions = unique(providers);
  const leave = requests.filter(r => {
    if (!isLeave(r) || !adminStatuses.has(statusKey(r.status))) return false;
    let details: any = r.details;
    if (typeof details === 'string') { try { details = JSON.parse(details); } catch { details = null; } }
    return !details?.end_date || details.end_date >= today;
  }).length;
  return {
    approvals: requests.filter(r => !isLeave(r) && (adminStatuses.has(statusKey(r.status)) || (statusKey(r.status) === 'approved' && statusKey(r.payout_status) === 'failed'))).length + submissions.filter(r => statusKey(r.status) === 'pending').length,
    finance: requests.filter(r => !isLeave(r) && financeStatuses.has(statusKey(r.status))).length + submissions.filter(r => statusKey(r.status) === 'awaiting_finance').length,
    procurementReview: requests.filter(r => !isLeave(r) && !isWithdrawal(r) && reviewStatuses.has(statusKey(r.status)) && needsReview('approval_requests', r.id)).length + submissions.filter(r => (statusKey(r.status) === 'pending' || (statusKey(r.status) === 'awaiting_finance' && r.meal_correction_pending)) && (r.meal_correction_pending || needsReview('provider_submission_requests', r.id))).length,
    leave,
  };
}

export function pendingQualityBatches(records: { id: string; batch_number: string | null; status: string }[], assessments: { store_record_id: string | null; batch_number: string | null }[]) {
  const ids = new Set(assessments.map(r => r.store_record_id).filter(Boolean));
  const batches = new Set(assessments.map(r => r.batch_number).filter(Boolean));
  return new Set(records.filter(r => ['pending', 'quality_review'].includes(statusKey(r.status)) && r.batch_number && !ids.has(r.id) && !batches.has(r.batch_number)).map(r => r.batch_number)).size;
}

export const navigationQueueKeys: Record<string, string[]> = {
  '/approvals': ['approvals', 'loans', 'instant', 'edits', 'deletions'], '/v2/admin': ['approvals', 'loans', 'instant', 'edits', 'deletions'],
  '/quick-loans': ['loans'],
  '/procurement': ['procurementReview', 'suppliers', 'clearances'], '/v2/procurement': ['procurementReview', 'suppliers', 'clearances'],
  '/procurement-review': ['procurementReview'], '/suppliers': ['suppliers'],
  '/finance': ['finance', 'salaries', 'coffeePayments'], '/v2/finance': ['finance', 'salaries', 'coffeePayments'],
  '/admin/leave-requests': ['leave'], '/human-resources': ['leave'], '/v2/hr': ['leave'],
  '/quality-control': ['quality'], '/v2/quality': ['qualityV2'],
  '/it-department': ['tickets'], '/v2/it': ['tickets'],
};

export function navigationCount(path: string, values: Record<string, number | undefined>): number | undefined {
  const keys = navigationQueueKeys[path];
  if (!keys) return undefined;
  if (keys.some(key => values[key] === undefined)) return undefined;
  return keys.reduce((sum, key) => sum + (values[key] ?? 0), 0);
}