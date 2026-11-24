import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import ts from 'typescript';
import { shouldEnforceMaintenance } from './maintenanceEnvironment';

test('Lovable preview is exempt while the published and custom sites enforce maintenance', () => {
  assert.equal(shouldEnforceMaintenance('id-preview--0ab47c69-3f36-4407-b03c-de1f9684ac9a.lovable.app'), false);
  assert.equal(shouldEnforceMaintenance('0ab47c69-3f36-4407-b03c-de1f9684ac9a.lovableproject.com'), false);
  assert.equal(shouldEnforceMaintenance('localhost'), false);
  assert.equal(shouldEnforceMaintenance('great-pearl-traceability-system.lovable.app'), true);
  assert.equal(shouldEnforceMaintenance('greatpearlcoffeesystem.site'), true);
  assert.equal(shouldEnforceMaintenance('id-preview--example.com'), true);
});

function runGuard(hostname: string, loading = false, scheduled = false) {
  let source = readFileSync('src/components/MaintenanceGuard.tsx', 'utf8');
  const parsed = ts.createSourceFile('guard.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const node of [...parsed.statements].reverse()) {
    if (ts.isImportDeclaration(node)) source = source.slice(0, node.getStart(parsed)) + source.slice(node.end);
  }
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  let signOuts = 0;
  const exports: Record<string, any> = {};
  new Script(code).runInNewContext({
    exports, window: { location: { hostname } }, shouldEnforceMaintenance,
    React: { Fragment: 'fragment', createElement: (type: unknown, props: unknown, children: unknown) => ({ type, props, children }) },
    useMaintenanceMode: () => ({ isActive: true, isManualActive: !scheduled, isScheduledActive: scheduled, loading }),
    useLocation: () => ({ pathname: '/dashboard' }),
    AuthContext: {}, MaintenancePage: 'maintenance',
    useContext: () => ({ user: { id: 'signed-in-staff' }, signOut: () => { signOuts++; } }),
    useEffect: (effect: () => void) => effect(),
  });
  return { result: exports.default({ children: 'workspace' }), signOuts };
}

test('active manual maintenance neither blocks nor signs out Lovable preview users', () => {
  const { result, signOuts } = runGuard('id-preview--0ab47c69-3f36-4407-b03c-de1f9684ac9a.lovable.app');
  assert.equal(result.children, 'workspace');
  assert.equal(signOuts, 0);
});

test('preview stays available while maintenance status loads and during scheduled downtime', () => {
  for (const loading of [false, true]) {
    const { result, signOuts } = runGuard('localhost', loading, true);
    assert.equal(result.children, 'workspace');
    assert.equal(signOuts, 0);
  }
});

test('published maintenance still blocks and signs out signed-in users', () => {
  for (const host of ['great-pearl-traceability-system.lovable.app', 'greatpearlcoffeesystem.site']) {
    const { result, signOuts } = runGuard(host);
    assert.equal(result.type, 'maintenance');
    assert.equal(signOuts, 1);
  }
});