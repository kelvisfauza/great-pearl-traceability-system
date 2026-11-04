import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WITHDRAWAL_SECOND_APPROVER_THRESHOLD,
  GENERAL_SECOND_APPROVER_THRESHOLD,
  isWithdrawalRequest,
  needsSecondAdminApproval,
  withdrawalHighValueFlag,
} from './withdrawalApprovalRules.ts';

test('withdrawals at or below UGX 150,000 need only one administrator', () => {
  assert.equal(WITHDRAWAL_SECOND_APPROVER_THRESHOLD, 150000);
  assert.equal(needsSecondAdminApproval(35000, true), false);
  assert.equal(needsSecondAdminApproval(55000, true), false);
  assert.equal(needsSecondAdminApproval(60000, true), false);
  assert.equal(needsSecondAdminApproval(72000, true), false);
  assert.equal(needsSecondAdminApproval(150000, true), false);
});

test('withdrawals above UGX 150,000 need a second administrator', () => {
  assert.equal(needsSecondAdminApproval(150001, true), true);
  assert.equal(needsSecondAdminApproval(350000, true), true);
});

test('non-withdrawal requests keep the UGX 50,000 two-administrator rule', () => {
  assert.equal(GENERAL_SECOND_APPROVER_THRESHOLD, 50000);
  assert.equal(needsSecondAdminApproval(60000, false), true);
  assert.equal(needsSecondAdminApproval(50000, false), false);
});

test('a withdrawal is recognised from its type or its stored details', () => {
  assert.equal(isWithdrawalRequest('Withdrawal Request', {}), true);
  assert.equal(isWithdrawalRequest('Expense', { request_type: 'withdrawal' }), true);
  assert.equal(isWithdrawalRequest('Expense', { is_withdrawal: true }), true);
  assert.equal(isWithdrawalRequest('Expense', { request_type: 'requisition' }), false);
});

test('the stored high-value flag follows the 150,000 withdrawal rule', () => {
  assert.equal(withdrawalHighValueFlag(60000), false);
  assert.equal(withdrawalHighValueFlag(150000), false);
  assert.equal(withdrawalHighValueFlag(200000), true);
});
