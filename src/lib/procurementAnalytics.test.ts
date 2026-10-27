import { it } from 'node:test';
import { strict as assert } from 'node:assert';
import { procurementWeek, summarizeProcurement, priceChange } from './procurementAnalytics';

const record = { coffeeType: 'Arabica', deliveryDate: '2026-10-26', kilograms: 100, weight: 2, pricePerKg: 8000, recordStatus: 'inventory' };
it('uses the current Monday-to-Sunday week including month boundaries', () => {
  assert.deepEqual(procurementWeek('2026-10-27'), { start: '2026-10-26', end: '2026-11-02', previousStart: '2026-10-19' });
});
it('counts saved kilograms and bags only within the selected week', () => {
  const groups = summarizeProcurement([record, { ...record, deliveryDate: '2026-10-25' }, { ...record, deliveryDate: '2026-11-02' }], '2026-10-26', '2026-11-02');
  assert.equal(groups[0]?.kilograms, 100);
  assert.equal(groups[0]?.bags, 2);
  assert.equal(groups[0]?.deliveries, 1);
});
it('weights saved prices by priced kilograms without inventing prices for unassessed deliveries', () => {
  const [group] = summarizeProcurement([record, { ...record, kilograms: 300, pricePerKg: 10000 }, { ...record, kilograms: 500, pricePerKg: null }], '2026-10-26', '2026-11-02');
  assert.equal(group?.averagePrice, 9500);
  assert.equal(group?.pricedKg, 400);
  assert.equal(group?.kilograms, 900);
});
it('leaves absent prices and trends empty and calculates real observed change', () => {
  assert.equal(summarizeProcurement([{ ...record, pricePerKg: null }], '2026-10-26', '2026-11-02')[0]?.averagePrice, null);
  assert.equal(priceChange(8000, null), null);
  assert.equal(priceChange(8000, 0), null);
  assert.equal(priceChange(8400, 8000), 5);
});
it('excludes rejected and cancelled deliveries from purchased quantities', () => {
  assert.equal(summarizeProcurement([{ ...record, recordStatus: 'QUALITY_REJECTED' }, { ...record, recordStatus: 'cancelled' }], '2026-10-26', '2026-11-02').length, 0);
});