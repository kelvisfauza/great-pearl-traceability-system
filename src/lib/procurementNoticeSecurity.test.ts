import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { reviewNoticeAllowed, reviewNoticeAlreadySent } from '../../supabase/functions/procurement-review-notify/noticeRules';

const caller = { internal: false, email: 'reviewer@example.test', name: 'Reviewer' };
const returned = { decision: 'returned', returned_by: caller.email, returned_at: '2026-11-24T08:00:00Z', return_count: 1 };

test('returned notices require a real saved return decision', () => {
  assert.equal(reviewNoticeAllowed('returned', returned, caller), true);
  assert.equal(reviewNoticeAllowed('returned', { ...returned, decision: 'pending' }, caller), false);
  assert.equal(reviewNoticeAllowed('returned', { ...returned, returned_at: null }, caller), false);
  assert.equal(reviewNoticeAllowed('returned', { ...returned, return_count: 0 }, caller), false);
});

test('returned notices must belong to their actual returning actor', () => {
  assert.equal(reviewNoticeAllowed('returned', returned, { ...caller, email: 'other@example.test', name: 'Other' }), false);
  assert.equal(reviewNoticeAllowed('returned', { ...returned, returned_by: 'Reviewer' }, caller), true);
});

test('reviewed notices require a saved decision and its reviewer', () => {
  const reviewed = { decision: 'approved', reviewed_by: 'Reviewer', reviewed_at: returned.returned_at };
  assert.equal(reviewNoticeAllowed('reviewed', reviewed, caller), true);
  assert.equal(reviewNoticeAllowed('reviewed', { ...reviewed, decision: 'pending' }, caller), false);
  assert.equal(reviewNoticeAllowed('reviewed', reviewed, { ...caller, email: 'other@example.test', name: 'Other' }), false);
});

test('internal notices still require committed proof', () => {
  assert.equal(reviewNoticeAllowed('returned', returned, { internal: true, email: null }), true);
  assert.equal(reviewNoticeAllowed('returned', { decision: 'pending' }, { internal: true, email: null }), false);
});

test('sent notices are preserved and a later return can be notified', () => {
  assert.equal(reviewNoticeAlreadySent('returned', { ...returned, return_notified_at: '2026-11-24T08:01:00Z' }), true);
  assert.equal(reviewNoticeAlreadySent('returned', { ...returned, return_notified_at: '2026-11-23T08:01:00Z' }), false);
  assert.equal(reviewNoticeAlreadySent('returned', returned), false);
});

function noticeHandler(review: Record<string, unknown>, role = 'Administrator') {
  const source = readFileSync('supabase/functions/procurement-review-notify/index.ts', 'utf8');
  const parsed = ts.createSourceFile('notice.ts', source, ts.ScriptTarget.Latest, true);
  let stripped = source;
  for (const node of [...parsed.statements].reverse()) {
    if (ts.isImportDeclaration(node)) stripped = stripped.slice(0, node.getStart(parsed)) + stripped.slice(node.end);
  }
  const code = ts.transpileModule(stripped, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const effects = { emails: 0, messages: 0, updates: 0 };
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const client = {
    functions: { invoke: async () => { effects.messages++; return { data: { ok: true } }; } },
    from: (table: string) => {
      if (!['employees', 'user_roles', 'procurement_reviews'].includes(table)) throw new Error(`Unexpected access: ${table}`);
      const own = { name: 'Reviewer', status: 'Active', disabled: false, permissions: [] };
      const recipients = [{ name: 'Procurement Reader', email: 'reader@example.test', phone: '0700000000', role: 'User', status: 'Active', department: 'Procurement', permissions: ['Procurement'] }];
      let many = false;
      const chain: any = {
        select: () => chain,
        ilike: () => chain,
        eq: () => chain,
        not: () => { many = true; return chain; },
        maybeSingle: async () => ({ data: table === 'employees' ? own : review }),
        then: (resolve: (value: unknown) => void) => resolve({ data: table === 'user_roles' ? [{ role }] : many ? recipients : own }),
        update: () => { effects.updates++; return { eq: async () => ({ error: null }) }; },
      };
      return chain;
    },
  };
  new Script(code).runInNewContext({ exports: {}, z, Request, Response, crypto, console,
    corsHeaders: { 'Access-Control-Allow-Origin': '*' }, reviewNoticeAllowed, reviewNoticeAlreadySent,
    Deno: { env: { get: () => 'test-only' }, serve: (fn: typeof handler) => { handler = fn; } },
    requireStaff: async () => ({ ...caller, userId: 'test-user' }), createClient: () => client,
    sendLovableEmail: async () => { effects.emails++; },
  });
  if (!handler) throw new Error('Notice handler missing');
  return { handler, effects };
}

const request = (extra: Record<string, unknown> = {}) => new Request('https://example.test', { method: 'POST', body: JSON.stringify({ mode: 'returned', record_id: 'saved-record', ...extra }) });

test('notice handler rejects fabricated returns before sending or changing records', async () => {
  const { handler, effects } = noticeHandler({ ...returned, decision: 'pending' });
  assert.equal((await (await handler(request())).json()).ok, false);
  assert.deepEqual(effects, { emails: 0, messages: 0, updates: 0 });
});

test('notice handler checks the actual saved returning actor', async () => {
  const { handler, effects } = noticeHandler({ ...returned, returned_by: 'other@example.test' });
  assert.equal((await (await handler(request())).json()).ok, false);
  assert.deepEqual(effects, { emails: 0, messages: 0, updates: 0 });
});

test('notice handler rejects ordinary staff even for a self-named return', async () => {
  const { handler, effects } = noticeHandler(returned, 'User');
  assert.equal((await (await handler(request())).json()).ok, false);
  assert.deepEqual(effects, { emails: 0, messages: 0, updates: 0 });
});

test('real administrator return sends only to saved Procurement recipients', async () => {
  const { handler, effects } = noticeHandler(returned);
  const response = await handler(request({ recipient_email: 'injected@example.test' }));
  const result = await response.json();
  assert.equal(result.ok, true);
  assert.equal(result.notified, 1);
  assert.deepEqual(effects, { emails: 1, messages: 1, updates: 1 });
});

test('already sent return notices are not sent or updated again', async () => {
  const { handler, effects } = noticeHandler({ ...returned, return_notified_at: '2026-11-24T08:01:00Z' });
  const result = await (await handler(request())).json();
  assert.equal(result.already_notified, true);
  assert.deepEqual(effects, { emails: 0, messages: 0, updates: 0 });
});

test('notice handler rejects unknown modes before effects', async () => {
  const { handler, effects } = noticeHandler(returned);
  assert.equal((await handler(request({ mode: 'made_up' }))).status, 400);
  assert.deepEqual(effects, { emails: 0, messages: 0, updates: 0 });
});