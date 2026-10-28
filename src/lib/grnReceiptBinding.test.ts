import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindGrnReceipt } from './grnReceiptBinding.ts';

const lot = { id: 'lot-018', batch_number: '20260221018', total_amount_ugx: 3471000 };
const payment = { id: 'payment-018', lot_id: lot.id, amount_paid_ugx: 3471000, status: 'posted' };

test('receipt stays bound to GRN 20260221018 and its recorded UGX 3,471,000', () => {
  const snapshot = bindGrnReceipt(lot, payment);
  const nextLot = { id: 'lot-009', batch_number: '20260222009', total_amount_ugx: 3738000 };
  assert.throws(() => bindGrnReceipt(nextLot, payment), /does not belong/);
  assert.deepEqual(snapshot, { grnNumber: 'GRN-20260221018', receiptNo: 'RCP-60221018', amount: 3471000, lotValue: 3471000 });
});

test('GRN 20260222009 receipts keep the individual saved payment figures', () => {
  const other = { id: 'lot-009', batch_number: '20260222009', total_amount_ugx: 3738000 };
  assert.equal(bindGrnReceipt(other, { ...payment, lot_id: other.id, amount_paid_ugx: 3738000 }).amount, 3738000);
  assert.equal(bindGrnReceipt(other, { ...payment, lot_id: other.id, amount_paid_ugx: 3471000 }).amount, 3471000);
});

test('failed or missing payments cannot generate paid receipts', () => {
  assert.throws(() => bindGrnReceipt(lot, { ...payment, status: 'failed' }), /confirmed saved payment/);
  assert.throws(() => bindGrnReceipt(lot, { ...payment, amount_paid_ugx: null }), /missing or invalid/);
});