import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionExpiryFetch, isConfirmedSessionExpiry } from './sessionExpiry';

test('confirmed expired sign-in triggers logout detection', () => {
  assert.equal(isConfirmedSessionExpiry(401, { code: 'PGRST301', message: 'JWT expired' }), true);
  assert.equal(isConfirmedSessionExpiry(400, { code: 'refresh_token_not_found' }), true);
});

test('unrelated system, permission and network errors do not trigger logout', () => {
  for (const [status, body] of [[500, { message: 'JWT expired' }], [401, { message: 'Unauthorized' }], [403, { message: 'permission denied' }], [400, { code: 'PGRST202' }], [0, { message: 'Failed to fetch' }]] as const) {
    assert.equal(isConfirmedSessionExpiry(status, body), false);
  }
});

test('only authenticated project requests trigger expiry handling; original response stays readable and is not retried', async () => {
  const tokens: string[] = [];
  let requests = 0;
  const fetcher = async () => { requests++; return new Response(JSON.stringify({ message: 'JWT expired' }), { status: 401 }); };
  const fetch = createSessionExpiryFetch('https://project.example', 'public-key', token => tokens.push(token), fetcher);
  const response = await fetch('https://project.example/rest/v1/records', { headers: { Authorization: 'Bearer staff-token' } });
  assert.deepEqual(await response.json(), { message: 'JWT expired' });
  await fetch('https://other.example/rest/v1/records', { headers: { Authorization: 'Bearer staff-token' } });
  await fetch('https://project.example/rest/v1/records', { headers: { Authorization: 'Bearer public-key' } });
  await fetch('https://project.example/auth/v1/token?grant_type=password', { headers: { Authorization: 'Bearer staff-token' } });
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.deepEqual(tokens, ['staff-token']);
  assert.equal(requests, 4);
});