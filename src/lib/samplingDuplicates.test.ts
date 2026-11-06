import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findSimilarSamplingOrders } from './samplingDuplicates';

const orders = [{ supplier_name: 'David Kakusi' }, { supplier_name: 'Sele' }, { supplier_name: 'Masereka Andrew' }];

test('flags the same supplier typed differently', () => {
  assert.equal(findSimilarSamplingOrders('david  KAKUSI', orders).length, 1);
});
test('flags a related name sharing a word', () => {
  assert.deepEqual(findSimilarSamplingOrders('Andrew', orders).map((o) => o.supplier_name), ['Masereka Andrew']);
});
test('does not flag an unrelated supplier', () => {
  assert.equal(findSimilarSamplingOrders('Bwambale Benson', orders).length, 0);
});
