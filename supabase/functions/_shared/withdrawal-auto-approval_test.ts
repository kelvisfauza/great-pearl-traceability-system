import { assertEquals } from 'jsr:@std/assert';
import { availableForCurrentRequest, evaluateWithdrawalAutoApproval as ev } from './withdrawal-auto-approval.ts';
const base = { amount: 20000, fee: 1600, channel: 'MOBILE_MONEY', walletBalance: 50000, availableBalance: 50000, recentTransferIn: 0, recentUnconfirmedPoints: 0, otherWithdrawalsToday: 0, payoutBalance: 100000, payoutFee: 1600, walletFrozen: false };
Deno.test('clean small withdrawal is approved', () => assertEquals(ev(base).decision, 'approve'));
Deno.test('current request is not counted twice against its own balance', () => {
  const available = availableForCurrentRequest(4980, 15000);
  assertEquals(available, 19980);
  assertEquals(ev({ ...base, amount: 15000, walletBalance: 19980, availableBalance: available }).decision, 'approve');
});
Deno.test('money from a fellow employee is rejected', () => assertEquals(ev({ ...base, walletBalance: 25000, availableBalance: 25000, recentTransferIn: 20000 }).decision, 'reject'));
Deno.test('transfer not needed for this amount is fine', () => assertEquals(ev({ ...base, recentTransferIn: 5000 }).decision, 'approve'));
Deno.test('overdraft-funded goes to normal approval', () => assertEquals(ev({ ...base, walletBalance: 10000, availableBalance: 10000 }).decision, 'manual'));
Deno.test('second withdrawal in a day goes to normal approval and is watched', () => {
  const d = ev({ ...base, otherWithdrawalsToday: 1 }); assertEquals(d.decision, 'manual'); assertEquals(d.watch, true);
});
Deno.test('unconfirmed points needed goes to normal approval', () => assertEquals(ev({ ...base, walletBalance: 25000, availableBalance: 25000, recentUnconfirmedPoints: 10000 }).decision, 'manual'));
Deno.test('signed in 2 days ago is approved', () => assertEquals(ev({ ...base, employeeActive: true, daysSinceLastWork: 2 }).decision, 'approve'));
Deno.test('no work activity for over 3 days goes to normal approval', () => assertEquals(ev({ ...base, employeeActive: true, daysSinceLastWork: 4 }).decision, 'manual'));
Deno.test('never worked goes to normal approval', () => assertEquals(ev({ ...base, daysSinceLastWork: null }).decision, 'manual'));
Deno.test('on leave goes to normal approval', () => assertEquals(ev({ ...base, onLeave: true }).decision, 'manual'));
Deno.test('suspended or inactive goes to normal approval', () => {
  assertEquals(ev({ ...base, suspended: true }).decision, 'manual');
  assertEquals(ev({ ...base, employeeActive: false }).decision, 'manual');
});
Deno.test('admin limit of 50,000 approves 40,000', () => assertEquals(ev({ ...base, amount: 40000, walletBalance: 60000, availableBalance: 60000, limit: 50000 }).decision, 'approve'));
Deno.test('admin limit of 10,000 sends 20,000 to normal approval', () => assertEquals(ev({ ...base, limit: 10000 }).decision, 'manual'));
Deno.test('two per day allowed: second withdrawal approved', () => assertEquals(ev({ ...base, otherWithdrawalsToday: 1, maxPerDay: 2 }).decision, 'approve'));
Deno.test('exactly 30,000 (charge excluded) is approved', () => assertEquals(ev({ ...base, amount: 30000, fee: 1600, walletBalance: 40000, availableBalance: 40000, limit: 30000 }).decision, 'approve'));
Deno.test('30,001 goes to normal approval', () => assertEquals(ev({ ...base, amount: 30001, walletBalance: 40000, availableBalance: 40000, limit: 30000 }).decision, 'manual'));
