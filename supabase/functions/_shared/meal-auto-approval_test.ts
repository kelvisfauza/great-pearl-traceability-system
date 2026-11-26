import { assertEquals } from 'jsr:@std/assert';
import { evaluateMealAutoApproval, kampalaDay } from './meal-auto-approval.ts';

const base = { requestType: 'meal_plan', amount: 20000, description: 'Beans - 11000\ntomatoes - 1000\nonions - 1000\ncooking oil - 2000\nchaco - 4000\ncharges - 1000', requestedPaymentMethod: 'mobile_money', autoApprovedToday: false, payoutBalance: 100000, payoutFee: 1600, recentPaidAmounts: [20000, 22000, 27000, 27500] };

Deno.test('itemised meal plan within rules is approved', () => assertEquals(evaluateMealAutoApproval(base).ok, true));
Deno.test('above 50,000 waits for Finance', () => assertEquals(evaluateMealAutoApproval({ ...base, amount: 51000, description: 'Beef - 51000', recentPaidAmounts: [] }).ok, false));
Deno.test('exactly 50,000 is allowed', () => assertEquals(evaluateMealAutoApproval({ ...base, amount: 50000, description: 'Beef - 50000', recentPaidAmounts: [] }).ok, true));
Deno.test('only one per day', () => assertEquals(evaluateMealAutoApproval({ ...base, autoApprovedToday: true }).ok, false));
Deno.test('needs items', () => assertEquals(evaluateMealAutoApproval({ ...base, description: 'Lunch for staff' }).ok, false));
Deno.test('other request types never auto approve', () => assertEquals(evaluateMealAutoApproval({ ...base, requestType: 'service_provider' }).ok, false));
Deno.test('not enough money blocks', () => assertEquals(evaluateMealAutoApproval({ ...base, payoutBalance: 21000 }).ok, false));
Deno.test('Uganda day rolls at 21:00 UTC', () => assertEquals(kampalaDay(new Date('2026-11-26T21:30:00Z')), '2026-11-27'));
Deno.test('admin meal limit of 30,000 leaves 40,000 for Finance', () => {
  const d = evaluateMealAutoApproval({ requestType: 'meal_plan', amount: 40000, description: 'Rice - 40000', requestedPaymentMethod: null, autoApprovedToday: false, payoutBalance: 999999, payoutFee: 0, recentPaidAmounts: [], limit: 30000 });
  assertEquals(d.ok, false);
});

const hist = ['Beans - 11000\ncharges - 1000', 'Meat - 35000\ncharges - 1000', 'Meat - 34000\nonions - 1000'];
Deno.test('meat at its usual price is approved even if total is higher than usual', () =>
  assertEquals(evaluateMealAutoApproval({ ...base, amount: 47500, description: 'Meat - 36000\nonions - 1000\ncharges - 10500', recentPaidAmounts: [20000, 20000, 20000], recentDescriptions: hist }).ok, true));
Deno.test('item far above its usual price waits', () =>
  assertEquals(evaluateMealAutoApproval({ ...base, amount: 30000, description: 'Beans - 30000', recentDescriptions: hist }).ok, false));
Deno.test('new item waits for Finance', () =>
  assertEquals(evaluateMealAutoApproval({ ...base, amount: 5000, description: 'Fish - 5000', recentDescriptions: hist }).ok, false));
