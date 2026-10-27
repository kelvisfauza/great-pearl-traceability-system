import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canDirectlyAddSupplier, validatePendingSupplier, canReviewRequest, requestStatusLabel } from './pendingSupplierRules.ts';

test('only admins or procurement save suppliers directly', () => {
  assert.equal(canDirectlyAddSupplier(true, false), true);
  assert.equal(canDirectlyAddSupplier(false, true), true);
  assert.equal(canDirectlyAddSupplier(false, false), false);
});

test('store proposal requires a name and origin', () => {
  assert.deepEqual(validatePendingSupplier({ name: '', origin: 'Kasese' }), { ok: false, error: 'Enter the supplier name' });
  assert.deepEqual(validatePendingSupplier({ name: 'Ab', origin: 'Kasese' }), { ok: false, error: 'Supplier name is too short' });
  assert.deepEqual(validatePendingSupplier({ name: 'Musa Kato', origin: '' }), { ok: false, error: 'Enter the supplier origin' });
});

test('valid proposal normalizes the name and keeps the coffee link', () => {
  const result = validatePendingSupplier({ name: '  Musa   Kato ', origin: 'Kasese', phone: ' 0772 000000 ', openingBalance: 5000, coffeeRecordId: 'rec-1' });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.name, 'Musa Kato');
    assert.equal(result.value.phone, '0772 000000');
    assert.equal(result.value.openingBalance, 5000);
    assert.equal(result.value.coffeeRecordId, 'rec-1');
  }
});

test('negative opening balance is rejected', () => {
  const result = validatePendingSupplier({ name: 'Musa Kato', origin: 'Kasese', openingBalance: -1 });
  assert.deepEqual(result, { ok: false, error: 'Opening balance cannot be negative' });
});

test('only pending requests can be reviewed', () => {
  assert.equal(canReviewRequest('pending'), true);
  assert.equal(canReviewRequest('confirmed'), false);
  assert.equal(canReviewRequest('declined'), false);
  assert.equal(requestStatusLabel('confirmed'), 'Confirmed');
  assert.equal(requestStatusLabel('declined'), 'Declined');
  assert.equal(requestStatusLabel('pending'), 'Pending');
});
