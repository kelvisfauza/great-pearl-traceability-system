import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeMetadata } from './routeMetadata.ts';

test('employee verification pages are not offered for indexing', () => {
  const meta = routeMetadata('/employee/private-staff-id');
  assert.equal(meta.noindex, true);
  assert.equal(meta.canonical, 'https://great-pearl-traceability-system.lovable.app/employee/private-staff-id');
});
test('private Finance pages are not offered for indexing', () => {
  assert.equal(routeMetadata('/v2/finance').noindex, true);
  assert.equal(routeMetadata('/careers').noindex, false);
});