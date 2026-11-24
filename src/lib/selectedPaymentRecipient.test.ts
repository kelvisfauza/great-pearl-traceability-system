import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import ts from 'typescript';

function evaluateRecipient(fileName: string, variable: string, context: Record<string, unknown>): unknown {
  const source = readFileSync(fileName, 'utf8');
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  let expression: string | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === variable && node.initializer) expression = node.initializer.getText(file);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && node.left.getText(file) === variable && node.right.getText(file).includes('o.destination_phone')) expression = node.right.getText(file);
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (!expression) throw new Error('Recipient expression missing');
  return new Script(`(${expression})`).runInNewContext(context);
}

test('part-payment cannot replace the approved wallet recipient', () => {
  assert.equal(evaluateRecipient('supabase/functions/finance-partial-payment/index.ts', 'payeePhone', {
    body: { phone: '256700000002' }, o: { destination_phone: '256700000001', target_phone: '256700000003' },
  }), '256700000001');
});
test('quotation payment ignores a submitted phone override', () => {
  assert.equal(evaluateRecipient('supabase/functions/quotation-notify/index.ts', 'rawPhone', {
    body: { payPhone: '256700000002' }, q: { phone: '256700000001' },
  }), '256700000001');
});
test('wallet payment keeps the recipient bound to the consent code', () => {
  assert.equal(evaluateRecipient('supabase/functions/finance-wallet-withdraw/index.ts', 'payPhone', {
    body: { payPhone: '256700000002' }, emp: { phone: '256700000003' }, row: { phone: '256700000001' },
  }), '256700000001');
});
test('approval code goes only to the approver saved number', () => {
  assert.equal(evaluateRecipient('supabase/functions/admin-approval-code/index.ts', 'phone', {
    body: { phone: '256700000002' }, emp: { phone: '256700000001' },
  }), '256700000001');
});