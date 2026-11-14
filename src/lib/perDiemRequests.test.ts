import { it } from 'node:test';
import { strict as assert } from 'node:assert';
import { printedPerDiemNumber, perDiemAwardable } from './perDiemRequests';

it('requires the printed form number', () => assert.throws(() => printedPerDiemNumber('  ')));
it('preserves the entered printed number rather than generating a new one', () => assert.equal(printedPerDiemNumber(' pd-20261028-abcd '), 'PD-20261028-ABCD'));
const approval = { approved_at: '2026-11-14', approved_by: 'admin-id' };
it('only administrator-approved printed requests appear for award', () => {
  assert.equal(perDiemAwardable({ status: 'pending', printed_at: '2026-10-28', ...approval }), true);
  assert.equal(perDiemAwardable({ status: 'draft', printed_at: '2026-10-28', ...approval }), false);
  assert.equal(perDiemAwardable({ status: 'pending', printed_at: null, ...approval }), false);
});
it('blocks awards until an administrator approves', () => {
  assert.equal(perDiemAwardable({ status: 'pending', printed_at: '2026-10-28', approved_at: null, approved_by: null }), false);
  assert.equal(perDiemAwardable({ status: 'pending', printed_at: '2026-10-28', approved_at: approval.approved_at, approved_by: null }), false);
});
it('a rejected request cannot proceed', () => assert.equal(perDiemAwardable({ status: 'rejected', printed_at: '2026-10-28', ...approval }), false));
it('an awarded request cannot be awarded again', () => assert.equal(perDiemAwardable({ status: 'awarded', printed_at: '2026-10-28', ...approval }), false));