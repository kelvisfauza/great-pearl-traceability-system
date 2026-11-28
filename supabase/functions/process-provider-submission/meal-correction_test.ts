import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { mealRecheckAllowed, returnMealForCorrection } from '../_shared/meal-correction-rules.ts';
import { evaluateMealAutoApproval } from '../_shared/meal-auto-approval.ts';

const saved = { request_type: 'meal_plan', status: 'awaiting_finance', admin_approved_amount: 47500, meal_revision: 1 };
Deno.test('a corrected meal plan retains Admin approval for automatic rechecking', () => {
  assertEquals(mealRecheckAllowed(saved, 1), true);
});
Deno.test('Finance payment first makes a late Procurement recheck ineligible', () => {
  assertEquals(mealRecheckAllowed({ ...saved, status: 'paid' }, 1), false);
  assertEquals(mealRecheckAllowed({ ...saved, status: 'processing' }, 1), false);
});
Deno.test('Procurement correction first invalidates the earlier revision', () => {
  assertEquals(mealRecheckAllowed({ ...saved, meal_revision: 2 }, 1), false);
});
Deno.test('an unapproved plan cannot use the retained-approval recheck', () => {
  assertEquals(mealRecheckAllowed({ ...saved, admin_approved_amount: null }, 1), false);
});
Deno.test('corrected item amounts pass the existing meal checks', () => {
  const input = { requestType: 'meal_plan', amount: 47500, description: 'Meat - 36000\nRice - 11500',
    requestedPaymentMethod: 'mobile_money', autoApprovedToday: false, payoutBalance: 100000, payoutFee: 1600,
    recentPaidAmounts: [20000], recentDescriptions: ['Meat - 18000\nRice - 11500'] };
  assertEquals(evaluateMealAutoApproval(input).ok, false);
  assertEquals(evaluateMealAutoApproval({ ...input, amount: 29500, description: 'Meat - 18000\nRice - 11500' }).ok, true);
});
Deno.test('Finance race prevents both the return and its email', async () => {
  let notices = 0;
  const db = { rpc: async () => ({ data: { ok: false, error: 'Payment started' }, error: null }),
    functions: { invoke: async () => { notices++; return {}; } } };
  assertEquals((await returnMealForCorrection(db, { id: 'saved', meal_revision: 1 }, 'Reduce meat cost')).ok, false);
  assertEquals(notices, 0);
});
Deno.test('failed email acceptance is not reported as delivered', async () => {
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-only');
  const db = { rpc: async () => ({ data: { ok: true }, error: null }),
    functions: { invoke: async () => ({ data: { ok: false }, error: null }) } };
  assertEquals(await returnMealForCorrection(db, { id: 'saved', meal_revision: 1 }, 'Reduce meat cost'), { ok: true, notified: false });
});