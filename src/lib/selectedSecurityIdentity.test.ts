import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import ts from 'typescript';
import { operationsReportRecipients } from '../../supabase/functions/_shared/operations-report-recipients';
import { deliveryAccepted } from '../../supabase/functions/_shared/message-policy';

function handler(name: string, context: Record<string, unknown>) {
  let source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
  const parsed = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
  for (const node of [...parsed.statements].reverse()) {
    if (ts.isImportDeclaration(node)) source = source.slice(0, node.getStart(parsed)) + source.slice(node.end);
  }
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  let serve: ((request: Request) => Promise<Response>) | undefined;
  new Script(code).runInNewContext({
    exports: {}, Request, Response, URL, console: { log() {}, error() {}, warn() {} },
    Deno: { env: { get: (key: string) => key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'service-key' : 'public-key' }, serve: (fn: typeof serve) => { serve = fn; } },
    serve: (fn: typeof serve) => { serve = fn; },
    autoTableMod: {}, corsHeaders: {}, operationsReportRecipients, deliveryAccepted, ...context,
  });
  if (!serve) throw new Error('Missing handler');
  return (body: unknown, token = '') => serve(new Request('https://example.test', {
    method: 'POST', headers: { Authorization: token }, body: JSON.stringify(body),
  }));
}

function verification(identity: string | null) {
  let bypassReads = 0;
  const run = handler('twofa-verification', {
    createClient: () => ({
      auth: { getUser: async () => ({ data: { user: identity ? { email: identity } : null } }) },
      rpc: async () => { bypassReads++; return { data: true }; },
    }),
  });
  return { run, reads: () => bypassReads };
}

test('anonymous verification cannot inspect a saved SMS bypass', async () => {
  const { run, reads } = verification(null);
  const response = await run({ action: 'verify_code', email: 'owner@example.test', phone: '0700000000' });
  assert.equal(reads(), 0);
  assert.equal((await response.json()).bypassed, undefined);
});

test('signed-in verification cannot inspect another employee bypass', async () => {
  const { run, reads } = verification('other@example.test');
  const response = await run({ action: 'verify_code', email: 'owner@example.test', phone: '0700000000' }, 'Bearer valid');
  assert.equal(reads(), 0);
  assert.equal((await response.json()).bypassed, undefined);
});

test('signed-in owner keeps their authorized verification bypass', async () => {
  const { run, reads } = verification('owner@example.test');
  const response = await run({ action: 'verify_code', email: 'owner@example.test' }, 'Bearer valid');
  assert.equal(reads(), 1);
  assert.equal((await response.json()).bypassed, true);
});

const savedEmployee = { id: 'saved-employee', name: 'Saved Name', email: 'saved@example.test', phone: '0700000000' };
function suspension(options: { absent?: boolean; mismatch?: boolean } = {}) {
  const sends: any[] = [];
  const writes: any[] = [];
  const run = handler('employee-suspension', {
    createClient: () => ({
      auth: { getUser: async () => ({ data: { user: { email: 'admin@example.test' } } }) },
      from: (table: string) => {
        let fields = '';
        const chain: any = {
          select: (value: string) => { fields = value; return chain; },
          ilike: () => chain, eq: () => chain,
          update: (values: unknown) => { writes.push({ table, values }); return chain; },
          insert: (values: unknown) => { writes.push({ table, values }); return chain; },
          single: async () => ({ data: { id: 'suspension' } }),
          maybeSingle: async () => ({ data: table === 'employee_suspensions'
            ? { employee_id: options.mismatch ? 'another-employee' : savedEmployee.id, employee_email: savedEmployee.email }
            : fields.includes('role') ? { role: 'Administrator', email: 'admin@example.test' }
            : options.absent ? null : savedEmployee }),
          then: (resolve: (value: unknown) => void) => Promise.resolve({ error: null }).then(resolve),
        };
        return chain;
      },
    }),
    fetch: async (_url: string, init: any) => { sends.push(JSON.parse(init.body)); return new Response('{}'); },
  });
  return { run, sends, writes };
}

test('suspension notices use saved employee contacts rather than supplied destinations', async () => {
  const { run, sends, writes } = suspension();
  const response = await run({ action: 'suspend', employeeId: savedEmployee.id, employeeEmail: savedEmployee.email,
    employeeName: 'Invented Name', employeePhone: '0799999999', reason: 'Test reason', startDate: '2026-11-24', endDate: '2026-11-25' });
  assert.equal((await response.json()).ok, true);
  assert.equal(sends[0].recipientEmail, savedEmployee.email);
  assert.equal(sends[0].templateData.recipientName, savedEmployee.name);
  assert.equal(sends[1].phone, savedEmployee.phone);
  assert.equal(writes[1].values.employee_phone, savedEmployee.phone);
});

test('missing employees and mismatched selected email cannot trigger suspension notices', async () => {
  for (const absent of [false, true]) {
    const { run, sends, writes } = suspension({ absent });
    const response = await run({ action: 'suspend', employeeId: savedEmployee.id, employeeEmail: 'attacker@example.test' });
    assert.equal((await response.json()).ok, false);
    assert.equal(sends.length, 0);
    assert.equal(writes.length, 0);
  }
});

test('lifting a suspension also uses saved contacts', async () => {
  const { run, sends } = suspension();
  const response = await run({ action: 'lift', employeeEmail: savedEmployee.email, employeePhone: '0799999999', suspensionId: 'suspension' });
  assert.equal((await response.json()).ok, true);
  assert.equal(sends[0].recipientEmail, savedEmployee.email);
  assert.equal(sends[1].phone, savedEmployee.phone);
});

test('a suspension belonging to a different employee cannot be lifted', async () => {
  const { run, sends, writes } = suspension({ mismatch: true });
  const response = await run({ action: 'lift', employeeEmail: savedEmployee.email, suspensionId: 'another-suspension' });
  assert.equal((await response.json()).ok, false);
  assert.equal(sends.length, 0);
  assert.equal(writes.length, 0);
});

test('operations report refuses unknown test recipients before report generation', async () => {
  let writes = 0;
  const run = handler('daily-operations-report', {
    requireInternalOrAdmin: async () => null,
    createClient: () => ({ from: () => {
      const chain: any = { select: () => chain, ilike: () => chain, eq: () => chain,
        maybeSingle: async () => ({ data: null }) };
      return chain;
    } }),
    jsPDF: () => { writes++; throw new Error('Report generated'); },
    sendLovableEmail: () => { writes++; throw new Error('Report sent'); },
  });
  const response = await run({ testEmail: 'external@example.test' });
  assert.equal((await response.json()).ok, false);
  assert.equal(writes, 0);
});

for (const allowed of [false, true]) {
  test(`receipt links ${allowed ? 'honor' : 'cannot bypass'} saved storage permissions`, async () => {
    let tokens = 0;
    const credentials: any[] = [];
    const run = handler('receipt-link', {
      requireStaff: async () => ({ internal: false, email: 'staff@example.test' }),
      createClient: (_url: string, key: string, options: any) => {
        credentials.push({ key, options });
        return { storage: { from: () => ({ createSignedUrl: async () => allowed
          ? { data: { signedUrl: 'https://example.test/authorized.pdf' } }
          : { data: null, error: { message: 'Not authorized' } } }) } };
      },
      receiptLink: async () => { tokens++; return 'https://example.test/receipt'; },
    });
    const result = await (await run({ ref: 'RCP-20261124-TEST' }, 'Bearer signed-in-staff')).json();
    assert.equal(result.ok, allowed);
    assert.equal(tokens, allowed ? 1 : 0);
    assert.equal(credentials[0].key, 'public-key');
    assert.equal(credentials[0].options.global.headers.Authorization, 'Bearer signed-in-staff');
  });
}

for (const authenticated of [false, true]) {
  test(`retired termination sender ${authenticated ? 'cannot send new notices' : 'rejects public requests'}`, async () => {
    let effects = 0;
    const forbidden = () => { effects++; throw new Error('Notification attempted'); };
    const run = handler('admin-send-termination', {
      requireInternalOrAdmin: async () => authenticated ? null : new Response('{}', { status: 401 }),
      fetch: forbidden, createClient: forbidden,
    });
    const response = await run({ token: 'old-embedded-token', phone: '0799999999', emailBody: 'Untrusted notice' });
    assert.equal(response.status, authenticated ? 200 : 401);
    if (authenticated) assert.equal((await response.json()).ok, false);
    assert.equal(effects, 0);
  });
}

test('scheduled reports exclude disabled administrators while preserving enabled recipients', () => {
  const recipients = operationsReportRecipients([
    { name: 'Allowed Admin', email: 'allowed@example.test', phone: '0700000000', role: 'Administrator', status: 'Active', disabled: false },
    { name: 'Disabled Admin', email: 'disabled@example.test', role: 'Administrator', status: 'Active', disabled: true },
    { email: 'staff@example.test', role: 'Staff', status: 'Active', disabled: false },
  ]);
  assert.deepEqual(recipients, [{ name: 'Allowed Admin', email: 'allowed@example.test', phone: '0700000000' }]);
});

test('test reports use the exact saved administrator address and cannot select disabled recipients', () => {
  const employees = [
    { name: 'Saved Admin', email: 'Saved.Admin@example.test', phone: '0700000000', role: 'Administrator', status: 'Active', disabled: false },
    { email: 'disabled@example.test', role: 'Administrator', status: 'Active', disabled: true },
  ];
  assert.deepEqual(operationsReportRecipients(employees, ' saved.admin@example.test '), [
    { name: 'Saved Admin', email: 'Saved.Admin@example.test', phone: null },
  ]);
  assert.deepEqual(operationsReportRecipients(employees, 'disabled@example.test'), []);
  assert.deepEqual(operationsReportRecipients(employees, 'external@example.test'), []);
});