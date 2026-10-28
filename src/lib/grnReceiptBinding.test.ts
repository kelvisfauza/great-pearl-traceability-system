import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindGrnReceipt, assertGrnPaymentTarget, captureGrnPaymentEntry, previousConfirmedGrnPayments } from './grnReceiptBinding.ts';

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

test('moving the queue or changing GRN figures blocks the open payment confirmation', () => {
  assertGrnPaymentTarget(lot, { ...lot });
  assert.throws(() => assertGrnPaymentTarget(lot, { ...lot, id: 'lot-009', batch_number: '20260222009' }), /changed/);
  assert.throws(() => assertGrnPaymentTarget(lot, { ...lot, total_amount_ugx: 3738000 }), /changed/);
});

test('captured payment details cannot change when the live entry is modified', () => {
  const entry = { lot: { ...lot }, payment: { ...payment }, record: { coffee_type: 'Arabica' } };
  const captured = captureGrnPaymentEntry(entry);
  entry.lot.batch_number = '20260222009';
  entry.payment.amount_paid_ugx = 3738000;
  entry.record.coffee_type = 'Robusta';
  assert.equal(bindGrnReceipt(captured.lot, captured.payment).grnNumber, 'GRN-20260221018');
  assert.equal(captured.payment.amount_paid_ugx, 3471000);
  assert.equal(captured.record.coffee_type, 'Arabica');
});

test('receipt totals exclude pending attempts and payments for other lots', () => {
  assert.equal(previousConfirmedGrnPayments(lot, payment, [payment,
    { ...payment, id: 'earlier', amount_paid_ugx: 30000 },
    { ...payment, id: 'pending', status: 'pending', amount_paid_ugx: 60000 },
    { ...payment, id: 'other', lot_id: 'lot-009', amount_paid_ugx: 3738000 },
  ]), 30000);
});