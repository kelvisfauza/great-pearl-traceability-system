import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import ts from 'typescript';

const endpoints = [
  'daily-loyalty-payout', 'send-airtime-sserunkuma-may2026', 'send-airtime-denis-wyclif-aug2026',
  'send-airtime-recheal-now', 'send-airtime-newstaff-aug2026', 'resend-price-updates',
  'broadcast-exit-time-830', 'broadcast-national-cleaning-day', 'send-provider-portal-invite',
  'attendance-monitor', 'daily-report-reminder', 'excel-daily-sync', 'send-payroll-payment-emails',
  'generate-comparison-insights', 'hr-airtime-batch', 'assess-fraud-navigation',
  'check-duplicate-expense', 'coffee-market-briefing', 'notify-role-change',
  'procurement-report-reminder', 'quality-pending-approvals-digest', 'procurement-daily-report',
  'daily-operations-report', 'onedrive-excel-loyalty', 'sunday-lunch-allowance',
  'loan-marketing-broadcast', 'prepay-june-allowances', 'broadcast-bereavement-notice',
  'resend-approval-sms', 'calculate-metrics', 'send-meeting-briefing', 'send-password-reset-sms',
];

for (const name of endpoints) {
  test(`${name} refuses unauthenticated execution before private reads or side effects`, async () => {
    const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
    const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
    let stripped = source;
    for (const node of [...file.statements].reverse()) {
      if (ts.isImportDeclaration(node)) stripped = stripped.slice(0, node.getStart(file)) + stripped.slice(node.end);
    }
    const js = ts.transpileModule(stripped, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    let handler: ((req: Request) => Promise<Response>) | undefined;
    let sideEffects = 0;
    const forbidden = () => { sideEffects++; throw new Error('private operation reached'); };
    const deny = async () => new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401 });
    new Script(js).runInNewContext({
      exports: {}, Deno: { env: { get: () => 'test-value' }, serve: (fn: typeof handler) => { handler = fn; } },
      serve: (fn: typeof handler) => { handler = fn; }, requireInternalOrAdmin: deny, requireStaff: deny,
      Response, Request, URL, crypto: globalThis.crypto, console, corsHeaders: {},
      createClient: forbidden, fetch: forbidden, sendLovableEmail: forbidden,
      yoSendAirtime: forbidden, autoTableMod: {}, jsPDF: forbidden,
    });
    if (!handler) throw new Error('Handler was not registered');
    const result = await handler(new Request('https://example.test', { method: 'POST', body: '{}' }));
    if (name === 'coffee-market-briefing') {
      // Display screens get a quiet refusal: still no briefing and no side effects.
      assert.equal(result.status, 200);
      assert.deepEqual(await result.json(), { ok: false, error: 'Unauthorized', denied: true });
    } else {
      assert.equal(result.status, 401);
    }
    assert.equal(sideEffects, 0);
    const preflight = await handler(new Request('https://example.test', { method: 'OPTIONS' }));
    assert.equal(preflight.status, 200);
  });
}