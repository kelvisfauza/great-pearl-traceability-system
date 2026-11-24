import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { phoneKey, ownTestDestination, deliveryAccepted, registeredPhone, mayMirrorEmailToSms, employeePhoneBlocked } from '../../supabase/functions/_shared/message-policy';
import { retiredMessageResponse } from '../../supabase/functions/_shared/retired-message';

test('Settings tests cannot be redirected to another phone or email', () => {
  const employee = { email: 'saved@example.test', phone: '0700000001' };
  assert.equal(ownTestDestination('sms', '+256700000001', employee), '0700000001');
  assert.equal(ownTestDestination('email', undefined, employee), 'saved@example.test');
  assert.throws(() => ownTestDestination('sms', '0700000002', employee));
  assert.throws(() => ownTestDestination('email', 'other@example.test', employee));
});

test('phone validation rejects unbounded destinations', () => {
  assert.equal(phoneKey('not-a-phone'), null);
  assert.equal(phoneKey('123'), null);
  assert.equal(phoneKey('+256 700 000 001'), '0700000001');
});

test('business refusal or skipped message is not reported as delivery acceptance', () => {
  assert.equal(deliveryAccepted(true, { success: false }), false);
  assert.equal(deliveryAccepted(true, { ok: true, skipped: true }), false);
  assert.equal(deliveryAccepted(true, { ok: true, error: 'blocked' }), false);
  assert.equal(deliveryAccepted(false, { success: true }), false);
  assert.equal(deliveryAccepted(true, { success: true }), true);
  assert.equal(deliveryAccepted(true, { success: true, email_status: 'failed' }), false);
});

test('ordinary browser email cannot become an SMS relay but trusted notices keep their mirror', () => {
  assert.equal(mayMirrorEmailToSms({ internal: false, isAdmin: false }), false);
  assert.equal(mayMirrorEmailToSms({ internal: true, isAdmin: false }), true);
  assert.equal(mayMirrorEmailToSms({ internal: false, isAdmin: true }), true);
});

test('retired manual senders do not read caller input', async () => {
  const req = new Request('https://example.test', { method: 'POST', body: '{invalid' });
  const response = retiredMessageResponse(req, {});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, false);
  assert.equal(req.bodyUsed, false);
});

test('disabled employee phone cannot be reauthorized through a supplier record', async () => {
  const tables: string[] = [];
  const db = { from(table: string) {
    tables.push(table);
    const chain = { select() { return chain; }, in() { return chain; }, limit() {
      return Promise.resolve({ data: [{ name: 'Blocked', disabled: true, status: 'Active' }], error: null });
    } };
    return chain;
  } };
  assert.equal(await registeredPhone(db, '0700000001'), null);
  assert.deepEqual(tables, ['employees', 'employees']);
  assert.equal(await employeePhoneBlocked(db, '0700000001'), true);
});

test('unknown phone is never a registered recipient', async () => {
  const db = { from() {
    const chain = { select() { return chain; }, in() { return chain; }, limit() { return Promise.resolve({ data: [], error: null }); } };
    return chain;
  } };
  assert.equal(await registeredPhone(db, '0700000001'), null);
});