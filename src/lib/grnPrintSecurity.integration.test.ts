import { test } from 'node:test';
import assert from 'node:assert/strict';

test('signed-out callers cannot revoke GRN prints', async () => {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase public configuration is required');
  const response = await fetch(`${url}/rest/v1/rpc/revoke_grn_prints`, {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_lot_ids: ['00000000-0000-0000-0000-000000000000'], p_reason: 'Misplaced papers' }),
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, '42501');
});