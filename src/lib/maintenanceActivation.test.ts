import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import ts from 'typescript';

function maintenance(options: { switchError?: unknown; smsSuccess?: boolean; scheduledActive?: boolean; statusError?: unknown } = {}) {
  const source = readFileSync('src/hooks/useMaintenanceMode.ts', 'utf8');
  const parsed = ts.createSourceFile('maintenance.ts', source, ts.ScriptTarget.Latest, true);
  let stripped = source;
  for (const node of [...parsed.statements].reverse()) {
    if (ts.isImportDeclaration(node)) stripped = stripped.slice(0, node.getStart(parsed)) + stripped.slice(node.end);
  }
  const code = ts.transpileModule(stripped, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  let messages = 0;
  const exports: Record<string, any> = {};
  const client = {
    rpc: (name: string, args: Record<string, unknown>) => {
      if (name === 'set_maintenance_mode') {
        rpcCalls.push({ name, args });
        return Promise.resolve({ data: { ok: true, id: 'saved-maintenance', is_active: args.p_activate }, error: options.switchError ?? null });
      }
      if (name === 'mark_maintenance_recovery_sms') {
        rpcCalls.push({ name, args });
        return Promise.resolve({ data: { ok: true }, error: null });
      }
      if (name === 'verify_and_deactivate_maintenance') return Promise.resolve({ data: true });
      return { maybeSingle: async () => ({ data: { is_active: false, scheduled_active: options.scheduledActive ?? false }, error: options.statusError }) };
    },
    functions: { invoke: async () => { messages++; return { data: { success: options.smsSuccess ?? true } }; } },
    from: (table: string) => {
      const chain: any = {
        select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
        maybeSingle: async () => table === 'employees'
          ? { data: { phone: '0700000000' } }
          : { data: null, error: null },
      };
      return chain;
    },
  };
  new Script(code).runInNewContext({ exports, supabase: client,
    useState: (initial: unknown) => [initial, () => {}], useCallback: (fn: unknown) => fn,
    useEffect: () => {}, console: { error: () => {} },
  });
  return { hook: exports.useMaintenanceMode(), rpcCalls, messages: () => messages };
}

test('activation switches maintenance on with a 10-digit code and 4-digit PIN', async () => {
  const { hook, rpcCalls, messages } = maintenance();
  const result = await hook.toggleMaintenance(true, 'Planned work', 'Authorized administrator', null);
  const switchCall = rpcCalls.find((c) => c.name === 'set_maintenance_mode');
  assert.equal(switchCall?.args.p_activate, true);
  assert.equal(switchCall?.args.p_reason, 'Planned work');
  assert.match(switchCall?.args.p_recovery_key as string, /^\d{10}$/);
  assert.match(switchCall?.args.p_recovery_pin as string, /^\d{4}$/);
  assert.match(result.code, /^\d{10}$/);
  assert.match(result.pin, /^\d{4}$/);
  assert.equal(result.smsSent, true);
  assert.equal(messages(), 1);
  const markCall = rpcCalls.find((c) => c.name === 'mark_maintenance_recovery_sms');
  assert.equal(markCall?.args.p_id, 'saved-maintenance');
  assert.equal(markCall?.args.p_phone, '0700000000');
});

test('failed switches do not send recovery codes', async () => {
  const failure = new Error('Save refused');
  const { hook, messages } = maintenance({ switchError: failure });
  await assert.rejects(hook.toggleMaintenance(true), (error) => error === failure);
  assert.equal(messages(), 0);
});

test('unconfirmed SMS does not mark recovery codes as sent', async () => {
  const { hook, rpcCalls } = maintenance({ smsSuccess: false });
  const result = await hook.toggleMaintenance(true);
  assert.equal(result.smsSent, false);
  assert.equal(rpcCalls.some((c) => c.name === 'mark_maintenance_recovery_sms'), false);
});

test('manual deactivation clears credentials without sending another SMS', async () => {
  const { hook, rpcCalls, messages } = maintenance();
  await hook.toggleMaintenance(false);
  const switchCall = rpcCalls.find((c) => c.name === 'set_maintenance_mode');
  assert.equal(switchCall?.args.p_activate, false);
  assert.equal(switchCall?.args.p_recovery_key, null);
  assert.equal(switchCall?.args.p_recovery_pin, null);
  assert.equal(messages(), 0);
});

test('recovery cannot report online while scheduled downtime remains active', async () => {
  const { hook } = maintenance({ scheduledActive: true });
  await assert.rejects(hook.deactivateWithKey('2468135790', '1357'), /maintenance is still active/);
});

test('recovery requires a confirmed status after the code is accepted', async () => {
  const { hook } = maintenance({ statusError: new Error('Status unavailable') });
  await assert.rejects(hook.deactivateWithKey('2468135790', '1357'), /could not be confirmed/);
});

test('recovery succeeds when manual and scheduled downtime are both inactive', async () => {
  const { hook } = maintenance();
  await hook.deactivateWithKey('2468135790', '1357');
});
