import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { mealReceiptEvidence } from '../_shared/meal-receipt-rules.ts';
const request = { request_type: 'meal_plan', status: 'paid', payout_status: 'success', payout_record_id: 'saved-payment' };
const payment = { id: 'saved-payment', yo_status: 'success' };
Deno.test('confirmed same-request meal payment can print a receipt', () => assertEquals(mealReceiptEvidence(request, payment), true));
Deno.test('recorded cash handover can print a receipt', () => assertEquals(mealReceiptEvidence({ ...request, payout_status: 'cash' }, { ...payment, yo_status: 'cash' }), true));
Deno.test('Admin approval without Finance payment cannot print a paid receipt', () => assertEquals(mealReceiptEvidence({ ...request, status: 'awaiting_finance' }, payment), false));
Deno.test('failed or pending payments cannot print a paid receipt', () => {
  for (const status of ['pending', 'failed', 'reversed']) assertEquals(mealReceiptEvidence(request, { ...payment, yo_status: status }), false);
  assertEquals(mealReceiptEvidence({ ...request, payout_status: 'failed' }, payment), false);
});
Deno.test('missing or different payment is never substituted', () => {
  assertEquals(mealReceiptEvidence(request, null), false);
  assertEquals(mealReceiptEvidence(request, { ...payment, id: 'other-payment' }), false);
});