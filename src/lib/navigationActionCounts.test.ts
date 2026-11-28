import { it } from 'node:test';
import { strict as assert } from 'node:assert';
import { navigationCount, pendingQualityBatches, requestActionCounts } from './navigationActionCounts';
const today = '2026-11-28';
it('returned Admin-approved meal plans count in Procurement and Finance, not Admin', () => {
  const result = requestActionCounts([], [{ id: 'meal', status: 'awaiting_finance', meal_correction_pending: true }], [{ source_table: 'provider_submission_requests', record_id: 'meal', decision: 'returned' }], today);
  assert.deepEqual(result, { approvals: 0, finance: 1, procurementReview: 1, leave: 0 });
});
it('paid and corrected plans leave the Procurement correction queue', () => {
  assert.equal(requestActionCounts([], [{ id: 'paid', status: 'paid', meal_correction_pending: true }, { id: 'corrected', status: 'awaiting_finance' }], [], today).procurementReview, 0);
});
it('personal withdrawals never count as Procurement actions', () => {
  assert.equal(requestActionCounts([{ id: 'w', status: 'Pending Admin', type: 'Withdrawal Request' }], [], [], today).procurementReview, 0);
});
it('counts each request once and separates Admin and Finance stages', () => {
  const row = { id: 'a', status: 'Pending Admin', type: 'expense' };
  const counts = requestActionCounts([row, row, { id: 'f', status: 'Pending Finance' }], [], [], today);
  assert.equal(counts.approvals, 1); assert.equal(counts.finance, 1);
});
it('completed Procurement reviews are not pending', () => {
  assert.equal(requestActionCounts([{ id: 'e', status: 'pending' }], [], [{ source_table: 'approval_requests', record_id: 'e', decision: 'approved' }], today).procurementReview, 0);
});
it('leave is separate from money approvals and expired dates do not count', () => {
  const counts = requestActionCounts([{ id: 'leave', type: 'Leave', status: 'Pending', details: { end_date: today } }, { id: 'old', type: 'leave', status: 'pending', details: { end_date: '2026-11-27' } }], [], [], today);
  assert.equal(counts.leave, 1); assert.equal(counts.approvals, 0);
});
it('quality counts unique unassessed pending batches', () => {
  assert.equal(pendingQualityBatches([{ id: 'a', batch_number: 'b', status: 'pending' }, { id: 'c', batch_number: 'b', status: 'pending' }, { id: 'd', batch_number: 'done', status: 'quality_review' }], [{ store_record_id: 'd', batch_number: 'done' }]), 1);
});
it('unknown reads never become a misleading zero and totals agree across menus', () => {
  assert.equal(navigationCount('/procurement', { procurementReview: 1, suppliers: 2 }), undefined);
  const counts = { procurementReview: 1, suppliers: 2, clearances: 3 };
  assert.equal(navigationCount('/procurement', counts), 6);
  assert.equal(navigationCount('/v2/procurement', counts), 6);
});