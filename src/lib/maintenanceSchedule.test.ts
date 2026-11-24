import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import ts from 'typescript';

function schedule(saved: unknown, error?: unknown) {
  let source = readFileSync('src/components/it/ScheduledDowntimeSettings.tsx', 'utf8');
  const parsed = ts.createSourceFile('schedule.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const node of [...parsed.statements].reverse()) {
    if (ts.isImportDeclaration(node)) source = source.slice(0, node.getStart(parsed)) + source.slice(node.end);
  }
  source = source.replace('if (loading) return null;', 'globalThis.saveSchedule = save; return null;');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
  const notices: any[] = [];
  const chain: any = { update: () => chain, eq: () => chain, select: () => chain, single: async () => ({ data: saved, error }) };
  const context: any = { exports: {}, supabase: { from: () => chain },
    useState: (value: unknown) => [value, () => {}], useEffect: () => {}, toast: (notice: unknown) => notices.push(notice) };
  new Script(code).runInNewContext(context);
  context.exports.default();
  return { save: context.saveSchedule, notices };
}

const config = { enabled: true, start_hour: 23, start_minute: 0, end_hour: 6, end_minute: 0, timezone: 'Africa/Kampala', reason: 'Maintenance' };

test('schedule refuses to report success when no saved row is returned', async () => {
  const { save, notices } = schedule(null);
  await save(config);
  assert.equal(notices[0].variant, 'destructive');
});

test('schedule refuses to report success when its write is denied', async () => {
  const { save, notices } = schedule(null, new Error('Denied'));
  await save(config);
  assert.equal(notices[0].variant, 'destructive');
});

test('schedule confirms a returned saved row', async () => {
  const { save, notices } = schedule({ setting_value: config });
  await save(config);
  assert.equal(notices.length, 1);
  assert.notEqual(notices[0].variant, 'destructive');
});