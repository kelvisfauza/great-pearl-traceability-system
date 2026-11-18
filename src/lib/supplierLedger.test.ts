import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSupplierLedger } from './supplierLedger';

test('balance owed = opening + delivery value - payments, in date order', () => {
  const r = buildSupplierLedger(10000,
    [{ date: '2026-11-01', kg: 100, value: 1_600_000, description: 'd1' }, { date: '2026-11-05', kg: 50, value: 800_000, description: 'd2' }],
    [{ date: '2026-11-03', amount: 1_000_000, description: 'p1' }]);
  assert.equal(r.totalKg, 150);
  assert.equal(r.totalPaid, 1_000_000);
  assert.equal(r.balance, 10000 + 2_400_000 - 1_000_000);
  assert.deepEqual(r.lines.map(l => l.description), ['Opening balance', 'd1', 'p1', 'd2']);
  assert.equal(r.lines[2].balance, 610000);
});
