import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATEMENT_FEE_PER_PAGE, STATEMENT_PRINT_FEE, statementFeeForPages } from './statementFees.ts';

test('statement costs UGX 500 per page', () => {
  assert.equal(STATEMENT_FEE_PER_PAGE, 500);
  assert.equal(statementFeeForPages(1), 500);
  assert.equal(statementFeeForPages(3), 1500);
  assert.equal(statementFeeForPages(7), 3500);
});

test('printing a statement costs UGX 1,000', () => {
  assert.equal(STATEMENT_PRINT_FEE, 1000);
});

test('never charges less than one page', () => {
  assert.equal(statementFeeForPages(0), 500);
});
