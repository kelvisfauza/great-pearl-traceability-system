import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseLegacyStationPrices, PRICE_SMS_QUALITY_LIMITS } from './compact-price-sms';

describe('legacy price SMS station selection', () => {
  it('keeps station prices rather than the obsolete standalone buying or local reference values', () => {
    const rows = parseLegacyStationPrices(`Great Agro Coffee Price Update 20/10/2026
Arabica: UGX 14,000/kg (80%)
HQ: Drugar 15,000, Sorted 16,400, Robusta 12,200, Wugar/DC 18,100, Parch Prem 15,600, Parch Ord 14,500
Kyarumba: Sorted 17,300, Ord 15,000, UG 11,400
Rubirizi: Drugar Clean 16,800, Ord 15,000
Local ref (UGX/kg): Drugar 14,800`);
    assert.deepEqual(rows.map(row => row.prices.map(price => price.value)), [
      [15000, 16400, 12200, 18100, 15600, 14500], [17300, 15000, 11400], [16800, 15000],
    ]);
  });
  it('uses the shared moisture limit of 14 percent', () => {
    assert.equal(PRICE_SMS_QUALITY_LIMITS.moisture, 14);
  });
  it('uses the shared maximum FM of 3 percent', () => {
    assert.equal(PRICE_SMS_QUALITY_LIMITS.maxFm, 3);
  });
});