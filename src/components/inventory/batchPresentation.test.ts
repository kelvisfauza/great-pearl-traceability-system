import { describe, expect, test } from 'bun:test';
import { batchAgeDays, qualityRange, remainingPurchaseValue } from './batchPresentation';

describe('saved batch presentation', () => {
  test('counts batch age in calendar days', () => {
    expect(batchAgeDays('2026-10-13', new Date(2026, 9, 19))).toBe(6);
  });
  test('retains a measured zero and ignores missing quality values', () => {
    expect(qualityRange([0, null, 2])).toBe('0.0–2.0%');
    expect(qualityRange([null, undefined])).toBe('Not recorded');
  });
  test('does not value unpriced stock', () => {
    expect(remainingPurchaseValue(500, 1000, 500, 14000)).toBeNull();
    expect(remainingPurchaseValue(500, 1000, 1000, 14000)).toBe(7000000);
  });
});