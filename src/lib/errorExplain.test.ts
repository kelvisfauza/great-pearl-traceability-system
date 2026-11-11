import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainError } from './errorExplain';

test('names the person, action, page and reason', () => {
  assert.equal(explainError('Kamugisha Ben', { page: '/store', url: 'https://x.supabase.co/rest/v1/rpc/get_active_scheduled_meeting_for_user', method: 'POST', status: 400, body: { code: 'PGRST202' } }),
    'Kamugisha Ben was trying to run the "get active scheduled meeting for user" check on the Store page, but it failed because the system could not find that check with the details sent (the app and database do not match — needs a developer fix).');
});
test('explains expired sign-in', () => {
  assert.ok(explainError('Ben', { page: '/finance', url: 'https://x/rest/v1/coffee_records', method: 'GET', status: 401 }).includes('load coffee records on the Finance page, but it failed because their sign-in had expired'));
});
