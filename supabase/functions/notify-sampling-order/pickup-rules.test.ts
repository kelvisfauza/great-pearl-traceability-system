import { strict as assert } from 'node:assert';
import { it } from 'node:test';
import { needsStorePickup, canReceivePickup, PICKUP_RECIPIENT_EMAILS } from './pickup-rules.ts';

it('Ben new orders require collection but other creators and past samples do not', () => {
  assert.equal(needsStorePickup({ created_by_email: 'bwambalebenson@greatpearlcoffee.com', status: 'pending' }), true);
  assert.equal(needsStorePickup({ created_by_email: 'onesmusrubambura@greatpearlcoffee.com', status: 'pending' }), false);
  assert.equal(needsStorePickup({ created_by_email: 'bwambalebenson@greatpearlcoffee.com', status: 'assessed' }), false);
});
it('pickup recipients are Alex and Onesmus only', () => {
  assert.deepEqual(PICKUP_RECIPIENT_EMAILS, ['tumwinealex@greatpearlcoffee.com', 'onesmusrubambura@greatpearlcoffee.com']);
  assert.equal(canReceivePickup({ email: 'nickscott@greatpearlcoffee.com', phone: '0770000000' }), false);
});
it('disabled recipients and missing phone numbers cannot receive pickup texts', () => {
  assert.equal(canReceivePickup({ email: PICKUP_RECIPIENT_EMAILS[0], phone: '0771974897', disabled: true }), false);
  assert.equal(canReceivePickup({ email: PICKUP_RECIPIENT_EMAILS[1], phone: null }), false);
  assert.equal(canReceivePickup({ email: PICKUP_RECIPIENT_EMAILS[1], phone: '0778479944', disabled: false }), true);
});