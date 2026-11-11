import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyProblem, isSafeRecovery } from './problem-resolution-rules';
test('code errors require investigation rather than claiming an automatic repair', () => {
  assert.equal(classifyProblem("TypeError: Cannot read properties of undefined").kind, 'code');
  assert.equal(classifyProblem('unexplained mismatch').kind, 'review');
});
test('connection errors can be diagnosed separately from code errors', () => {
  assert.equal(classifyProblem('upstream connection timeout').kind, 'connection');
});
test('safe retries never resend payments or change balances or permissions', () => {
  for (const action of ['connection_check', 'record_check', 'reload_records']) assert.equal(isSafeRecovery(action), true);
  for (const action of ['resend_payment', 'refund_wallet', 'change_permissions', 'execute_sql', 'unknown']) assert.equal(isSafeRecovery(action), false);
});