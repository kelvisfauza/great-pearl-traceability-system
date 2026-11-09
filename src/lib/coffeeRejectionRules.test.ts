import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coffeeRejectionReason, type CoffeeRejectionReadings } from './coffeeRejectionRules';

const base: CoffeeRejectionReadings = { moisture: 13, gp1: 0, gp2: 0, less12: 0, pods: 0, husks: 0, stones: 0 };
for (const [field, maximum] of [['moisture',18],['gp1',14],['gp2',28],['less12',4],['pods',4],['husks',4],['stones',4]] as const) {
  test(`${field} allows ${maximum}% and rejects ${maximum + 0.1}%`, () => {
    for (const isArabica of [true, false]) {
      assert.equal(coffeeRejectionReason({ ...base, [field]: maximum }, isArabica), null);
      assert.notEqual(coffeeRejectionReason({ ...base, [field]: maximum + 0.1 }, isArabica), null);
    }
  });
}
test('4% each foreign matter is allowed despite a combined 12%', () => {
  for (const isArabica of [true, false]) assert.equal(coffeeRejectionReason({ ...base, pods: 4, husks: 4, stones: 4 }, isArabica), null);
});
test('Robusta in Arabica keeps the separate 3% contamination limit', () => {
  assert.equal(coffeeRejectionReason({ ...base, robustaInArabica: 3 }), null);
  assert.notEqual(coffeeRejectionReason({ ...base, robustaInArabica: 3.1 }), null);
});