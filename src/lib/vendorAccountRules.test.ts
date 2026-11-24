import { it } from 'node:test';
import assert from 'node:assert/strict';
import { canClearVendorRequest } from './vendorAccountRules';

it('meal plans must have a vendor before Procurement sends them for approval', () => {
  assert.equal(canClearVendorRequest('provider_submission_requests', 'meal_plan', null), false);
  assert.equal(canClearVendorRequest('provider_submission_requests', 'meal_plan', 'vendor-1'), true);
});
it('service-provider requests must have a vendor before Procurement sends them for approval', () => {
  assert.equal(canClearVendorRequest('provider_submission_requests', 'service_provider', null), false);
  assert.equal(canClearVendorRequest('provider_submission_requests', 'service_provider', 'vendor-1'), true);
});
it('vendor linking does not change staff withdrawal approval requirements', () => {
  assert.equal(canClearVendorRequest('approval_requests', 'withdrawal', null), true);
});