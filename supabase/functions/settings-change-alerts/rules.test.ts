import { strict as assert } from 'node:assert';
import { it } from 'node:test';
import { alertData, emailDelivered, SETTINGS_ALERT_RECIPIENT } from './rules.ts';
it('settings changes notify Fauza at her saved administrator email', () => {
  assert.equal(SETTINGS_ALERT_RECIPIENT, 'fauzakusa@greatpearlcoffee.com');
});
it('a failed or skipped email is not treated as delivered', () => {
  assert.equal(emailDelivered({ ok: true, email_status: 'failed' }), false);
  assert.equal(emailDelivered({ ok: true, skipped: true }), false);
  assert.equal(emailDelivered({ ok: true, email_status: 'sent' }), true);
});
it('emails contain change identity but never serialize sensitive event values', () => {
  const event = { control: 'Security policy', record_label: 'security_settings', actor: 'Fauza', action: 'update', fields: ['setting_value'], created_at: '2026-11-11T08:10:00Z', token: 'private-token', setting_value: { password: 'private-password' } };
  const data = alertData(event);
  assert.ok(data.message.includes('Security policy'));
  assert.ok(data.message.includes('Fauza'));
  assert.ok(data.message.includes('2026-11-11T08:10:00Z'));
  assert.equal(JSON.stringify(data).includes('private-token'), false);
  assert.equal(JSON.stringify(data).includes('private-password'), false);
});