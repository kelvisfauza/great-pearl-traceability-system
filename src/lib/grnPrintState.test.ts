import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasActiveGrnPrint } from './grnPrintState.ts';

test('revoked misplaced GRN becomes selectable for Print while today’s unrelated print stays printed', () => {
  const misplaced = { id: 'old-lot', batch_number: 'OLD-GRN' };
  const today = { id: 'today-lot', batch_number: 'TODAY-GRN' };
  const rows = [{ lot_id: 'old-lot', batch_number: 'OLD-GRN' }, { lot_id: 'today-lot', batch_number: 'TODAY-GRN' }];
  assert.equal(hasActiveGrnPrint(misplaced, rows), true);
  const remaining = rows.filter(row => row.lot_id !== misplaced.id);
  assert.equal(hasActiveGrnPrint(misplaced, remaining), false);
  assert.equal(hasActiveGrnPrint(today, remaining), true);
});

test('batch-only Quality print still counts until its matching active record is revoked', () => {
  const lot = { id: 'finance-lot', batch_number: 'Batch-42' };
  assert.equal(hasActiveGrnPrint(lot, [{ lot_id: 'quality-placeholder', batch_number: 'BATCH-42' }]), true);
  assert.equal(hasActiveGrnPrint(lot, []), false);
});