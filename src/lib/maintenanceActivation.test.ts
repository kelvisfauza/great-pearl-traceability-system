import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import ts from 'typescript';

function maintenance(options: { readError?: unknown; writeError?: unknown; smsSuccess?: boolean } = {}) {
  const source = readFileSync('src/hooks/useMaintenanceMode.ts', 'utf8');
  const parsed = ts.createSourceFile('maintenance.ts', source, ts.ScriptTarget.Latest, true);
  let stripped = source;
  for (const node of [...parsed.statements].reverse()) {
    if (ts.isImportDeclaration(node)) stripped = stripped.slice(0, node.getStart(parsed)) + stripped.slice(node.end);
  }
  const code = ts.transpileModule(stripped, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const writes: Record<string, unknown>[] = [];
  let messages = 0;
  const exports: Record<string, any> = {};
  const client = {
    rpc: () => ({ maybeSingle: async () => ({ data: { is_active: false, scheduled_active: false } }) }),
    functions: { invoke: async () => { messages++; return { data: { success: options.smsSuccess ?? true } }; } },
    from: (table: string) => {
      const chain: any = {
        select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
        maybeSingle: async () => table === 'employees'
          ? { data: { phone: '0700000000' } }
          : { data: { id: 'saved-maintenance' }, error: options.readError },
        single: async () => ({ data: { id: 'saved-maintenance' }, error: options.writeError }),
        update: (values: Record<string, unknown>) => { writes.push(values); return chain; },
      };
      return chain;
    },
  };
  new Script(code).runInNewContext({ exports, supabase: client,
    useState: (initial: unknown) => [initial, () => {}], useCallback: (fn: unknown) => fn,
    useEffect: () => {}, console: { error: () => {} },
  });
  return { hook: exports.useMaintenanceMode(), writes, messages: () => messages };
}

test('activation saves active state with a 10-digit code and 4-digit PIN', async () => {
  const { hook, writes, messages } = maintenance();
  const result = await hook.toggleMaintenance(true, 'Planned work', 'Authorized administrator', null);
  assert.equal(writes[0].is_active, true);
  assert.equal(writes[0].reason, 'Planned work');
  assert.match(result.code, /^\d{10}$/);
  assert.match(result.pin, /^\d{4}$/);
  assert.equal(result.smsSent, true);
  assert.equal(messages(), 1);
  assert.equal(writes[1].recovery_sms_sent, true);
});

test('failed reads do not write a maintenance state or send codes', async () => {
  const failure = new Error('Read refused');
  const { hook, writes, messages } = maintenance({ readError: failure });
  await assert.rejects(hook.toggleMaintenance(true), (error) => error === failure);
  assert.equal(writes.length, 0);
  assert.equal(messages(), 0);
});

test('failed activation saves do not send recovery codes', async () => {
  const failure = new Error('Save refused');
  const { hook, messages } = maintenance({ writeError: failure });
  await assert.rejects(hook.toggleMaintenance(true), (error) => error === failure);
  assert.equal(messages(), 0);
});

test('unconfirmed SMS does not mark recovery codes as sent', async () => {
  const { hook, writes } = maintenance({ smsSuccess: false });
  const result = await hook.toggleMaintenance(true);
  assert.equal(result.smsSent, false);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].recovery_sms_sent, false);
});

test('manual deactivation clears credentials without sending another SMS', async () => {
  const { hook, writes, messages } = maintenance();
  await hook.toggleMaintenance(false);
  assert.equal(writes[0].is_active, false);
  assert.equal(writes[0].recovery_key, null);
  assert.equal(writes[0].recovery_pin, null);
  assert.equal(messages(), 0);
});