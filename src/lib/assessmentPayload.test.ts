import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessmentInsertPayload, isRobustaCoffee } from './assessmentPayload';

test('Robusta delivery selects Robusta, not Arabica', () => {
  assert.equal(isRobustaCoffee('Robusta FAQ'), true);
  assert.equal(isRobustaCoffee('robusta'), true);
  assert.equal(isRobustaCoffee('Arabica'), false);
  assert.equal(isRobustaCoffee('Drugar'), false);
});

test('assessment saves exclude the offline status instruction but preserve readings and operation identity', () => {
  const input = { moisture: 16, suggested_price: 7000, client_op_id: 'assessment-1', _coffee_record_status_update: 'AWAITING_PRICING' };
  assert.deepEqual(assessmentInsertPayload(input), { moisture: 16, suggested_price: 7000, client_op_id: 'assessment-1' });
  assert.equal(input._coffee_record_status_update, 'AWAITING_PRICING');
});