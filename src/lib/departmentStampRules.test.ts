import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { personalApprovalStamp, documentDepartmentStamp, departmentStampDate } from './departmentStampRules';

describe('department stamp rules', () => {
  it('uses Operations Manager only for Fauza identities', () => {
    assert.equal(personalApprovalStamp('Fauza Kusa 2'), 'operations');
    assert.equal(personalApprovalStamp('Fauza Kelvis'), 'operations');
    assert.equal(personalApprovalStamp('Administrator'), undefined);
  });
  it('uses Supervisor only for recorded Bwambale Denis', () => {
    assert.equal(personalApprovalStamp('bwambale denis'), 'supervisor');
    assert.equal(personalApprovalStamp('Denis'), undefined);
  });
  it('uses Quality for sampling and analysis even when printed by another department', () => {
    assert.equal(documentDepartmentStamp('Sampling order SO-123', 'Store Management', 'Fauza Kusa'), 'quality');
    assert.equal(documentDepartmentStamp('Quality analysis form QA-123', 'Finance'), 'quality');
  });
  it('uses Finance for payments instead of the printing employee personal stamp', () => {
    assert.equal(documentDepartmentStamp('Payment receipt RCP-123', 'Procurement', 'Bwambale Denis'), 'finance');
  });
  it('uses the Procurement stamp for Procurement documents', () => {
    assert.equal(documentDepartmentStamp('Meal plan requisition MP-123'), 'procurement');
    assert.equal(documentDepartmentStamp('Report', 'Procurement'), 'procurement');
  });
  it('uses the general business stamp when no department matches', () => {
    assert.equal(documentDepartmentStamp('Company form', 'IT', 'Other staff'), 'business');
  });
  it('changes dates at midnight Uganda time, not browser midnight', () => {
    assert.equal(departmentStampDate('2026-11-23T20:59:59Z'), '23 NOV 2026');
    assert.equal(departmentStampDate('2026-11-23T21:00:00Z'), '24 NOV 2026');
    assert.throws(() => departmentStampDate('invalid'), /valid stamp date/);
  });
});