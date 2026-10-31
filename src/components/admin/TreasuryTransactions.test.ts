import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('./TreasuryTransactions.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
}).outputText;
const start = compiled.indexOf('const load = async () =>');
const end = compiled.indexOf('void load();', start);
assert.ok(start >= 0 && end > start);
const createLoad = new Function('supabase', 'account', 'direction', 'reference', 'from', 'to', 'page', 'PAGE_SIZE', 'active', 'setBusy', 'setError', 'setRows', 'setCount', `${compiled.slice(start, end)}; return load;`);

function setup(options: { from?: string; to?: string; page?: number; error?: string } = {}) {
  const calls: any[] = [];
  const state = { error: null as string | null, busy: false, rows: [] as any[], count: 0 };
  const q: any = {};
  for (const method of ['select', 'eq', 'ilike', 'gte', 'lte', 'order']) q[method] = (...args: any[]) => { calls.push([method, ...args]); return q; };
  q.range = async (...args: any[]) => { calls.push(['range', ...args]); return { data: [{ id: 'saved' }], count: 101, error: options.error ? { message: options.error } : null }; };
  const load = createLoad({ from: () => q }, 'operations', 'credit', 'REACTIVATION', options.from || '', options.to || '', options.page || 0, 50, true,
    (v: boolean) => { state.busy = v; }, (v: string | null) => { state.error = v; }, (v: any[]) => { state.rows = v; }, (v: number) => { state.count = v; });
  return { load, calls, state };
}

test('date filters cover complete Kampala business days', async () => {
  const { load, calls } = setup({ from: '2026-10-01', to: '2026-10-31' });
  await load();
  assert.ok(calls.some(c => c[0] === 'gte' && c[2] === '2026-10-01T00:00:00+03:00'));
  assert.ok(calls.some(c => c[0] === 'lte' && c[2] === '2026-10-31T23:59:59.999999+03:00'));
});

test('movement pages do not overlap and preserve account and direction filters', async () => {
  const { load, calls, state } = setup({ page: 1 });
  await load();
  assert.deepEqual(calls.find(c => c[0] === 'range'), ['range', 50, 99]);
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'account_code' && c[2] === 'operations'));
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'direction' && c[2] === 'credit'));
  assert.equal(state.count, 101);
});

test('invalid date ranges do not query movements', async () => {
  const { load, calls, state } = setup({ from: '2026-10-31', to: '2026-10-01' });
  await load();
  assert.equal(calls.length, 0);
  assert.ok(state.error);
  assert.equal(state.busy, false);
});

test('failed movement queries do not present stale records as successful results', async () => {
  const { load, state } = setup({ error: 'permission denied' });
  await load();
  assert.equal(state.error, 'permission denied');
  assert.deepEqual(state.rows, []);
  assert.equal(state.count, 0);
});