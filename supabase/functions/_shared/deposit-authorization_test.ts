import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ownedDepositMatches } from './deposit-authorization.ts';

Deno.test('deposit dispatch requires the saved owner, phone, amount and pending state', () => {
  const row = { user_id: 'owner', amount: 10000, phone: '256700000001', status: 'pending', transaction_type: 'deposit' };
  assertEquals(ownedDepositMatches(row, 'owner', 10000, row.phone), true);
  assertEquals(ownedDepositMatches(row, 'other', 10000, row.phone), false);
  assertEquals(ownedDepositMatches(row, 'owner', 20000, row.phone), false);
  assertEquals(ownedDepositMatches(row, 'owner', 10000, '256700000002'), false);
  assertEquals(ownedDepositMatches({ ...row, status: 'completed' }, 'owner', 10000, row.phone), false);
  assertEquals(ownedDepositMatches({ ...row, transaction_type: 'loan_repayment' }, 'owner', 10000, row.phone), true);
});