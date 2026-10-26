import { it } from 'node:test';
import { strict as assert } from 'node:assert';

async function callPublicRpc(name: string, body: unknown) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase public configuration is required');
  return fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
it('signed-out users cannot invoke administrator sale attachment', async () => {
  const response = await callPublicRpc('attach_sale_to_delivery_note', { p_clearance_id: '00000000-0000-0000-0000-000000000000', p_sale_id: '00000000-0000-0000-0000-000000000000' });
  assert.equal(response.status, 401);
  const error = await response.json();
  assert.equal(error.code, '42501');
});
it('signed-out users cannot query the administrator access check', async () => {
  const response = await callPublicRpc('can_admin_store_dispatch', {});
  assert.equal(response.status, 401);
  const error = await response.json();
  assert.equal(error.code, '42501');
});