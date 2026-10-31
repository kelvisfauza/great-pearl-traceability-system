import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Exercise the component's actual handler without a signed-in database session.
const source = ts.transpileModule(readFileSync(new URL('./MillingReports.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
}).outputText;
const start = source.indexOf('const printMonthReport =');
const end = source.indexOf('const customerDebtAnalysis =', start);
assert.ok(start >= 0 && end > start, 'Monthly print handler must be found');
const createHandler = new Function('window', 'monthReportData', 'customers', 'customerDebtAnalysis', 'reportPrintError', 'setShowMonthSelector',
  `${source.slice(start, end)}; return printMonthReport;`);
const month = {
  monthName: 'October 2026', transactions: [], cashTransactions: [], expenses: [],
  summary: { totalKgsHulled: 0, totalRevenue: 0, totalExpenses: 0, netRevenue: 0, totalCashReceived: 0, totalTransactions: 0, totalPayments: 0 },
};

test('monthly print opens synchronously and leaves the window alive for shared verification', () => {
  const calls: string[] = [];
  const child = { document: { write: () => calls.push('write'), close: () => calls.push('document-close') }, focus: () => calls.push('focus'), print: () => calls.push('print'), close: () => calls.push('window-close') };
  const handler = createHandler({ open: () => { calls.push('open'); return child; } }, month, [], () => ({ all: [] }), (error: unknown) => { throw error; }, () => calls.push('dismiss-selector'));
  handler();
  assert.deepEqual(calls, ['open', 'write', 'document-close', 'focus', 'print', 'dismiss-selector']);
});

test('blocked monthly print reports an error and keeps the selector open for retry', () => {
  const errors: Error[] = [];
  let dismissed = false;
  createHandler({ open: () => null }, month, [], () => ({ all: [] }), (error: Error) => errors.push(error), () => { dismissed = true; })();
  assert.equal(errors.length, 1);
  assert.equal(dismissed, false);
});

test('monthly preparation failure closes the blank window and reports the failure', () => {
  let closed = false;
  const errors: Error[] = [];
  const failure = new Error('Unavailable report data');
  createHandler({ open: () => ({ close: () => { closed = true; } }) }, month, [], () => { throw failure; }, (error: Error) => errors.push(error), () => {})();
  assert.equal(closed, true);
  assert.deepEqual(errors, [failure]);
});