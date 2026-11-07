import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { withdrawalServiceCharge } from './withdrawalServiceCharge';

describe('Service charges on every withdrawal channel', () => {
  for (const channel of ['yo', 'gosentepay', 'cash', 'bank']) {
    it(`${channel}: charges UGX 1,100 up to 60,000`, () => {
      assert.equal(withdrawalServiceCharge(30_000), 1_100);
      assert.equal(withdrawalServiceCharge(60_000), 1_100);
    });
    it(`${channel}: charges UGX 1,700 from 60,001 to 500,000`, () => {
      assert.equal(withdrawalServiceCharge(60_001), 1_700);
      assert.equal(withdrawalServiceCharge(100_000), 1_700);
      assert.equal(withdrawalServiceCharge(500_000), 1_700);
    });
  }
  it('preserves higher tiers', () => {
    assert.equal(withdrawalServiceCharge(500_001), 2_500);
    assert.equal(withdrawalServiceCharge(1_000_000), 2_500);
    assert.equal(withdrawalServiceCharge(1_000_001), 2_900);
    assert.equal(withdrawalServiceCharge(499), 0);
  });
});