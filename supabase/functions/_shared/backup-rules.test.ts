import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canRestore, providerMessage } from './backup-rules';
const backup = { id: 2228693640, status: 'COMPLETED', inserted_at: '2026-11-11T02:15:05.038Z' };
test('only Super Admin can restore', () => {
  assert.equal(canRestore(['Administrator'], 1000, 1100, `RESTORE ${backup.inserted_at}`, backup), false);
  assert.equal(canRestore(['Super Admin'], 1000, 1100, `RESTORE ${backup.inserted_at}`, backup), true);
});
test('restore requires recent sign-in within ten minutes', () => {
  assert.equal(canRestore(['Super Admin'], 1000, 1600, `RESTORE ${backup.inserted_at}`, backup), true);
  assert.equal(canRestore(['Super Admin'], 1000, 1601, `RESTORE ${backup.inserted_at}`, backup), false);
});
test('restore must match a freshly confirmed completed backup', () => {
  assert.equal(canRestore(['Super Admin'], 1000, 1100, 'RESTORE', backup), false);
  assert.equal(canRestore(['Super Admin'], 1000, 1100, `RESTORE ${backup.inserted_at}`, { ...backup, status: 'PENDING' }), false);
  assert.equal(canRestore(['Super Admin'], 1000, 1100, `RESTORE ${backup.inserted_at}`, undefined), false);
});
test('upstream HTML is not shown while provider errors retain their status', () => {
  assert.equal(providerMessage(522, '<html>Cloudflare</html>'), '[522] Supabase request failed');
  assert.equal(providerMessage(402, '{"message":"This feature requires the Enterprise organization plan."}'), '[402] This feature requires the Enterprise organization plan.');
});