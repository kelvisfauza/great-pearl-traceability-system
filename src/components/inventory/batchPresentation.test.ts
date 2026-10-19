import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';
import { batchAgeDays, qualityRange, remainingPurchaseValue } from './batchPresentation';

describe('saved batch presentation', () => {
  test('counts batch age in calendar days', () => {
    assert.equal(batchAgeDays('2026-10-13', new Date(2026, 9, 19)), 6);
  });
  test('retains a measured zero and ignores missing quality values', () => {
    assert.equal(qualityRange([0, null, 2]), '0.0–2.0%');
    assert.equal(qualityRange([null, undefined]), 'Not recorded');
  });
  test('does not value unpriced stock', () => {
    assert.equal(remainingPurchaseValue(500, 1000, 500, 14000), null);
    assert.equal(remainingPurchaseValue(500, 1000, 1000, 14000), 7000000);
  });
});