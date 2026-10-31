import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('./TreasuryAccountsPanel.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
}).outputText;
const start = source.indexOf('const openHistory =');
const end = source.indexOf('const printHistory =', start);
assert.ok(start >= 0 && end > start);
const createHandler = new Function('supabase', 'setHistoryCode', 'setHistoryLoading', 'setHistory', 'setHistoryError',
  `${source.slice(start, end)}; return openHistory;`);

function setup(result: unknown) {
  const state = { code: '', loading: false, rows: [{ id: 'stale' }], error: null as string | null };
  const query = {
    select: () => query,
    eq: (_field: string, code: string) => { assert.equal(code, 'operations'); return query; },
    order: () => query,
    limit: async () => result,
  };
  const handler = createHandler({ from: () => query },
    (code: string) => { state.code = code; },
    (loading: boolean) => { state.loading = loading; },
    (rows: { id: string }[]) => { state.rows = rows; },
    (error: string | null) => { state.error = error; });
  return { state, handler };
}

test('failed movement reads clear stale entries and preserve the error', async () => {
  const { state, handler } = setup({ data: null, error: { message: 'permission denied' } });
  await handler('operations');
  assert.equal(state.error, 'permission denied');
  assert.deepEqual(state.rows, []);
  assert.equal(state.loading, false);
});

test('successful movement reads return saved entries', async () => {
  const { state, handler } = setup({ data: [{ id: 'saved-credit' }], error: null });
  await handler('operations');
  assert.deepEqual(state.rows, [{ id: 'saved-credit' }]);
  assert.equal(state.error, null);
  assert.equal(state.loading, false);
});