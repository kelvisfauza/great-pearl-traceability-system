import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import ts from 'typescript';

function load(name: string, context: Record<string, unknown>) {
  const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
  let stripped = source;
  for (const node of [...file.statements].reverse()) {
    if (ts.isImportDeclaration(node)) stripped = stripped.slice(0, node.getStart(file)) + stripped.slice(node.end);
  }
  const js = ts.transpileModule(stripped, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const register = (fn: typeof handler) => { handler = fn; };
  new Script(js).runInNewContext({
    exports: {}, Deno: { env: { get: (key: string) => key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'service-test' : 'public-test' }, serve: register },
    serve: register, Request, Response, URL, console, ...context,
  });
  if (!handler) throw new Error('Handler not registered');
  return handler;
}

for (const endpoint of ['fingerprint-approve', 'generate-report']) {
  test(`${endpoint} denies anonymous callers before reading records`, async () => {
    let reads = 0;
    const denied = async () => new Response('{}', { status: 401 });
    const handler = load(endpoint, {
      requireStaff: denied, requireInternalOrAdmin: denied,
      createClient: () => { reads++; throw new Error('Private read'); },
    });
    const result = await handler(new Request('https://example.test', { method: 'POST', body: '{}' }));
    assert.equal(result.status, 401);
    assert.equal(reads, 0);
  });
}

test('fingerprint lookups cannot target another employee', async () => {
  let reads = 0;
  const handler = load('fingerprint-approve', {
    requireStaff: async () => ({ internal: false, email: 'owner@example.test' }),
    createClient: () => { reads++; throw new Error('Private read'); },
  });
  const result = await handler(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ action: 'begin', email: 'other@example.test' }) }));
  assert.equal((await result.json()).ok, false);
  assert.equal(reads, 0);
});

for (const action of ['begin', 'enroll_begin', 'enroll_finish', 'finish']) {
  test(`fingerprint ${action} blocks inactive employees before credential access`, async () => {
    const tables: string[] = [];
    const handler = load('fingerprint-approve', {
      requireStaff: async () => ({ internal: false, email: 'owner@example.test' }),
      createClient: () => ({ from: (table: string) => {
        tables.push(table);
        if (table !== 'employees') throw new Error('Credential accessed for an inactive employee');
        return { select: () => ({ ilike: () => ({ maybeSingle: async () => ({ data: { email: 'owner@example.test', status: 'Inactive', disabled: false } }) }) }) };
      } }),
    });
    const response = await handler(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ action, email: 'owner@example.test', credential_id: 'test-credential' }) }));
    assert.equal((await response.json()).ok, false);
    assert.deepEqual(tables, ['employees']);
  });
}

test('active employees can read only their own fingerprint details', async () => {
  const filters: string[][] = [];
  const handler = load('fingerprint-approve', {
    requireStaff: async () => ({ internal: false, email: 'owner@example.test' }),
    createClient: () => ({ from: (table: string) => ({ select: () => ({ ilike: (field: string, value: string) => {
      filters.push([table, field, value]);
      return { maybeSingle: async () => ({ data: table === 'employees'
        ? { email: 'owner@example.test', name: 'Owner', status: 'Active', disabled: false }
        : { email: 'owner@example.test', credential_id: 'owner-test-credential' } }) };
    } }) }) }),
  });
  const response = await handler(new Request('https://example.test', { method: 'POST', body: JSON.stringify({ action: 'begin', email: 'owner@example.test' }) }));
  const result = await response.json();
  assert.equal(result.ok, true);
  assert.equal(result.credential_id, 'owner-test-credential');
  assert.deepEqual(filters, [['employees', 'email', 'owner@example.test'], ['biometric_credentials', 'email', 'owner@example.test']]);
});

test('reports use saved sources and the user session, ignoring injected table names', async () => {
  const tables: string[] = [];
  const clients: unknown[][] = [];
  const handler = load('generate-report', {
    requireInternalOrAdmin: async () => null,
    requireStaff: async () => ({ internal: false, email: 'owner@example.test' }),
    createClient: (...args: unknown[]) => {
      clients.push(args);
      return { from: (table: string) => {
        tables.push(table);
        return { select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { name: 'Quality Analysis', category: 'Quality', data_sources: ['quality_assessments'] } }) }),
          limit: async () => ({ data: [{ status: 'approved' }] }),
        }) };
      } };
    },
  });
  const response = await handler(new Request('https://example.test', {
    method: 'POST', headers: { Authorization: 'Bearer user-test' },
    body: JSON.stringify({ template_id: 'saved-template', data_sources: ['employees', 'biometric_credentials'], category: 'Finance', format: 'pdf' }),
  }));
  const data = await response.json();
  assert.equal(data.success, true);
  assert.deepEqual(tables, ['report_templates', 'quality_assessments']);
  assert.equal(clients[0][1], 'public-test');
  assert.equal((clients[0][2] as any).global.headers.Authorization, 'Bearer user-test');
  assert.equal(data.report.summary.total_assessments, 1);
});