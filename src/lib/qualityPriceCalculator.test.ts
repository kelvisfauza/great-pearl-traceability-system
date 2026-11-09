import { test } from 'node:test';
import assert from 'node:assert/strict';

const { calculateQualityPrice, defaultCalculatorInputs, buildCalculatorInputs } = await import('./qualityPriceCalculator');

for (const coffeeType of ['arabica', 'robusta']) {
  for (const [field, limit] of [['moisture',18],['gp1',14],['gp2',28],['less12',4],['pods',4],['husks',4],['stones',4]] as const) {
    test(`${coffeeType} calculator accepts ${field} ${limit}% but rejects above`, () => {
      const inputs = { ...defaultCalculatorInputs, refPrice: '15000', moisture: '13', [field]: String(limit) };
      const accepted = calculateQualityPrice(inputs, coffeeType);
      assert.equal(accepted.rejectFinal, false);
      assert.notEqual(accepted.finalPrice, null);
      const rejected = calculateQualityPrice({ ...inputs, [field]: String(limit + 0.1) }, coffeeType);
      assert.equal(rejected.rejectFinal, true);
      assert.equal(rejected.finalPrice, null);
    });
  }
  test(`${coffeeType} calculator does not reject combined foreign matter of 12%`, () => {
    const result = calculateQualityPrice({ ...defaultCalculatorInputs, refPrice: '15000', moisture: '13', pods: '4', husks: '4', stones: '4' }, coffeeType);
    assert.equal(result.fm, 12);
    assert.equal(result.rejectFinal, false);
  });
}
test('Arabica and Robusta deductions remain unchanged', () => {
  const inputs = { ...defaultCalculatorInputs, refPrice: '15000', moisture: '18', gp1: '14', gp2: '28', less12: '4', pods: '4', husks: '4', stones: '4' };
  assert.equal(calculateQualityPrice(inputs, 'arabica').finalPrice, 10570);
  assert.equal(calculateQualityPrice(inputs, 'robusta').finalPrice, 12150);
});
test('saved below12 and explicit stones are used rather than replaced by zeros', () => {
  const inputs = buildCalculatorInputs({ below12: 4.1, stones: 4.1, fm: 0 }, 'arabica', 15000);
  assert.equal(inputs.less12, '4.1');
  assert.equal(inputs.stones, '4.1');
  assert.equal(calculateQualityPrice(inputs, 'arabica').rejectFinal, true);
});