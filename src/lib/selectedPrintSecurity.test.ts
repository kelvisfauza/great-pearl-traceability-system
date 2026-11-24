import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import ts from 'typescript';
import { escapeHtml } from './escapeHtml';

test('saved loan names and guarantor contacts remain text in all terms outputs', () => {
  const source = readFileSync('src/utils/loanTermsPrint.ts', 'utf8').replace(/^import .*;\n/gm, '');
  const exports: Record<string, (loan: unknown, slot?: number) => string> = {};
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Script(js).runInNewContext({ exports, escapeHtml, COMPANY_NAME: 'Company', COMPANY_TAGLINE: 'Group', COMPANY_ADDRESS: '', COMPANY_PHONES: '', COMPANY_EMAIL: '' });
  const attack = '<img src=x onerror="alert(1)">';
  const loan = { employee_name: attack, employee_email: attack, employee_phone: attack, loan_type: attack, guarantor_name: attack, guarantor_email: attack, guarantor_phone: attack };
  for (const method of ['buildBorrowerTermsHtml', 'buildGuarantorTermsHtml', 'buildFullLoanTermsPackHtml']) {
    const output = exports[method](loan, 1);
    assert.equal(output.includes(attack), false);
    assert.equal(output.includes(escapeHtml(attack)), true);
  }
});