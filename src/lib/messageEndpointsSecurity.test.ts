import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { ownTestDestination, SETTINGS_TEST_MESSAGE, SETTINGS_TEST_SUBJECT } from '../../supabase/functions/_shared/message-policy';
import { retiredMessageResponse } from '../../supabase/functions/_shared/retired-message';

function load(name: string, context: Record<string, unknown>) {
  let source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
  for (const node of [...file.statements].reverse()) if (ts.isImportDeclaration(node)) source = source.slice(0, node.getStart(file)) + source.slice(node.end);
  let handler: ((req: Request) => Promise<Response>) | undefined;
  new Script(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText).runInNewContext({
    exports: {}, Request, Response, URLSearchParams, z, corsHeaders: {}, ownTestDestination,
    SETTINGS_TEST_MESSAGE, SETTINGS_TEST_SUBJECT, retiredMessageResponse,
    console: { log() {}, warn() {}, error() {} }, btoa,
    Deno: { env: { get: () => 'configured-test-value' }, serve: (fn: typeof handler) => { handler = fn; } },
    ...context,
  });
  if (!handler) throw new Error('Missing handler');
  return handler;
}

function testSender() {
  const messages: Record<string, unknown>[] = [];
  const employee = { email: 'saved@example.test', phone: '0700000001', status: 'active', disabled: false };
  const db = {
    rpc: async () => ({ data: false }),
    from(table: string) {
      const chain = {
        select() { return chain; }, ilike() { return chain; }, eq() { return chain; }, gte() { return chain; }, in() { return chain; },
        limit() { return Promise.resolve({ data: [], error: null }); },
        maybeSingle() { return Promise.resolve({ data: employee, error: null }); },
        insert() { return Promise.resolve({ error: null }); },
        then(resolve: (data: unknown) => unknown) { return Promise.resolve({ data: table === 'system_settings' ? [{ setting_key: 'sms_provider', setting_value: 'yoola' }] : [], error: null }).then(resolve); },
      };
      return chain;
    },
  };
  const run = load('send-message', {
    createClient: () => db,
    requireStaff: async () => ({ internal: false, isAdmin: true, email: employee.email, userId: 'saved-user' }),
    fetch: async (_url: unknown, init: { body: string }) => { messages.push(JSON.parse(init.body)); return new Response(JSON.stringify({ status: 'success' })); },
  });
  return { run, messages };
}

test('actual Settings handler rejects custom content before any outbound call', async () => {
  const { run, messages } = testSender();
  const res = await run(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ channel: 'sms', message: 'Arbitrary content' }) }));
  assert.equal((await res.json()).success, false);
  assert.equal(messages.length, 0);
});

test('actual Settings handler rejects foreign destinations before any outbound call', async () => {
  const { run, messages } = testSender();
  const res = await run(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ channel: 'sms', to: '0700000002' }) }));
  assert.equal((await res.json()).success, false);
  assert.equal(messages.length, 0);
});

test('actual Settings handler preserves fixed test delivery to saved contact', async () => {
  const { run, messages } = testSender();
  const res = await run(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ channel: 'sms' }) }));
  assert.equal((await res.json()).success, true);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].phone, '0700000001');
  assert.equal(messages[0].message, SETTINGS_TEST_MESSAGE);
});

for (const name of ['system-sms', 'test-sms', 'send-infobip-sms', 'send-salary-sms-manual']) {
  test(`${name} has no outbound effect even with arbitrary request content`, async () => {
    let sends = 0;
    const run = load(name, { fetch: () => { sends++; throw new Error('Unexpected send'); } });
    const response = await run(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ phone: '0700000009', message: 'Arbitrary' }) }));
    assert.equal((await response.json()).success, false);
    assert.equal(sends, 0);
  });
}