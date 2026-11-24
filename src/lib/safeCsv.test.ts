import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { csvCell } from './safeCsv';

test('formula-leading values remain text even after whitespace', () => {
  for (const value of ['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', '  =1', '\t=1']) {
    assert.equal(csvCell(value), `"'${value}"`);
  }
});
test('CSV separators and quotes stay inside one cell', () => {
  assert.equal(csvCell('A,"B"\nC'), '"A,""B""\nC"');
  assert.equal(csvCell(10000), '"10000"');
  assert.equal(csvCell(null), '""');
});