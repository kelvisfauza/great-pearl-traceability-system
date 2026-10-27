import { it } from 'node:test';
import { strict as assert } from 'node:assert';
import { mealPlanPayload, mealPaymentAllowed } from './mealPlanRules';
const form = { documentNumber: ' mp-2026-000001 ', name: 'Recipient', phone: '0772123456', email: '', amount: '50000', description: 'Lunch ingredients', payment: 'mobile_money' as const };
it('preserves the paper number and UGX amount on the meal request', () => { const p = mealPlanPayload(form); assert.equal(p.paper_document_number, 'MP-2026-000001'); assert.equal(p.invoice_number, p.paper_document_number); assert.equal(p.amount, 50000); });
it('mobile money retains the recipient number and requires a valid number', () => { assert.equal(mealPlanPayload(form).phone, '0772123456'); assert.throws(() => mealPlanPayload({ ...form, phone: '' })); });
it('cash requests do not require a mobile money number', () => assert.equal(mealPlanPayload({ ...form, payment: 'cash', phone: '' }).requested_payment_method, 'cash'));
it('cash cannot send mobile money', () => { assert.equal(mealPaymentAllowed('cash', 'momo'), false); assert.equal(mealPaymentAllowed('cash', 'cash'), true); });
it('mobile money cannot be recorded as cash or bank', () => { assert.equal(mealPaymentAllowed('mobile_money', 'cash'), false); assert.equal(mealPaymentAllowed('mobile_money', 'bank'), false); assert.equal(mealPaymentAllowed('mobile_money', 'momo'), true); assert.equal(mealPaymentAllowed('mobile_money', 'gosentepay'), true); });