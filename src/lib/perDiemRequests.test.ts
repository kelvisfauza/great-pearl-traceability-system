import { it } from 'node:test';
import { strict as assert } from 'node:assert';
import { printedPerDiemNumber, perDiemAwardable } from './perDiemRequests';

it('requires the printed form number', () => assert.throws(() => printedPerDiemNumber('  ')));
it('preserves the entered printed number rather than generating a new one', () => assert.equal(printedPerDiemNumber(' pd-20261028-abcd '), 'PD-20261028-ABCD'));
it('only submitted printed requests appear for award', () => {
  assert.equal(perDiemAwardable({ status: 'pending', printed_at: '2026-10-28' }), true);
  assert.equal(perDiemAwardable({ status: 'draft', printed_at: '2026-10-28' }), false);
  assert.equal(perDiemAwardable({ status: 'pending', printed_at: null }), false);
});
it('an awarded request cannot be awarded again', () => assert.equal(perDiemAwardable({ status: 'awarded', printed_at: '2026-10-28' }), false));