import { assertEquals } from 'jsr:@std/assert';
import { evaluateWithdrawalAutoApproval as ev } from './withdrawal-auto-approval.ts';
const base = { amount: 20000, fee: 1600, channel: 'MOBILE_MONEY', walletBalance: 50000, availableBalance: 50000, recentTransferIn: 0, recentUnconfirmedPoints: 0, otherWithdrawalsToday: 0, payoutBalance: 100000, payoutFee: 1600, walletFrozen: false };
Deno.test('clean small withdrawal is approved', () => assertEquals(ev(base).decision, 'approve'));
Deno.test('29,999 approved, 30,000 goes to normal approval', () => {
  assertEquals(ev({ ...base, amount: 29999 }).decision, 'approve');
  assertEquals(ev({ ...base, amount: 30000 }).decision, 'manual');
});
Deno.test('money from a fellow employee is rejected', () => assertEquals(ev({ ...base, walletBalance: 25000, availableBalance: 25000, recentTransferIn: 20000 }).decision, 'reject'));
Deno.test('transfer not needed for this amount is fine', () => assertEquals(ev({ ...base, recentTransferIn: 5000 }).decision, 'approve'));
Deno.test('overdraft-funded goes to normal approval', () => assertEquals(ev({ ...base, walletBalance: 10000, availableBalance: 10000 }).decision, 'manual'));
Deno.test('second withdrawal in a day goes to normal approval and is watched', () => {
  const d = ev({ ...base, otherWithdrawalsToday: 1 }); assertEquals(d.decision, 'manual'); assertEquals(d.watch, true);
});
Deno.test('unconfirmed points needed goes to normal approval', () => assertEquals(ev({ ...base, walletBalance: 25000, availableBalance: 25000, recentUnconfirmedPoints: 10000 }).decision, 'manual'));
