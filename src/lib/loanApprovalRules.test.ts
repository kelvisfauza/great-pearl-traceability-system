import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loanApprovalBlock } from './loanApprovalRules';

const loan = { status: 'pending_admin', loan_type: 'quick', employee_email: 'borrower@example.com', guarantor_email: 'guarantor@example.com', guarantor_approved: true, terms_accepted: true, terms_signature: 'signed' };
test('only administrators may approve loans', () => {
  assert.ok(loanApprovalBlock(loan, 'reviewer@example.com', false));
  assert.equal(loanApprovalBlock(loan, 'reviewer@example.com', true), null);
});
test('borrowers cannot approve their own loan', () => {
  assert.ok(loanApprovalBlock(loan, 'BORROWER@example.com', true));
});
test('neither guarantor may approve the loan as administrator', () => {
  assert.ok(loanApprovalBlock(loan, 'guarantor@example.com', true));
  assert.ok(loanApprovalBlock({ ...loan, guarantor2_email: 'second@example.com' }, 'second@example.com', true));
});
test('required guarantees cannot be bypassed', () => {
  assert.ok(loanApprovalBlock({ ...loan, guarantor_approved: false }, 'reviewer@example.com', true));
  assert.ok(loanApprovalBlock({ ...loan, loan_type: 'business' }, 'reviewer@example.com', true));
  assert.equal(loanApprovalBlock({ ...loan, loan_type: 'business', guarantor2_email: 'second@example.com', guarantor2_approved: true }, 'reviewer@example.com', true), null);
  assert.ok(loanApprovalBlock({ ...loan, loan_type: 'business', guarantor2_email: loan.guarantor_email, guarantor2_approved: true }, 'reviewer@example.com', true));
  assert.equal(loanApprovalBlock({ ...loan, loan_type: 'pure_salary', guarantor_email: null, guarantor_approved: false }, 'reviewer@example.com', true), null);
});
test('unsigned or declined revised terms prevent approval', () => {
  assert.ok(loanApprovalBlock({ ...loan, terms_signature: '' }, 'reviewer@example.com', true));
  assert.ok(loanApprovalBlock({ ...loan, revision_amount: 200000 }, 'reviewer@example.com', true));
  assert.equal(loanApprovalBlock({ ...loan, revision_amount: 200000, revision_signed_at: '2026-11-09', revision_signature: 'signed' }, 'reviewer@example.com', true), null);
});
test('completed, guarantor-pending and already approved loans cannot be approved again', () => {
  for (const status of ['active', 'completed', 'pending_guarantor', 'revision_pending_signature']) assert.ok(loanApprovalBlock({ ...loan, status }, 'reviewer@example.com', true));
  assert.ok(loanApprovalBlock({ ...loan, admin_approved: true }, 'reviewer@example.com', true));
});