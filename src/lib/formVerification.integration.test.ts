import { describe, it as test } from 'node:test';
import { strict as assert } from 'node:assert';

// Run against the connected project's public endpoint; no staff session required.
async function verify(code: string) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase public configuration is required');
  const response = await fetch(`${url}/rest/v1/rpc/verify_by_code`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ _code: code }),
  });
  assert.equal(response.status, 200);
  return response.json();
}

describe('Issued printed form verification', () => {
  test('the existing printed quality form verifies anonymously', async () => {
    const rows = await verify('GAC-QA-2610-0166');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].reference_no, 'GAC QA 2610-0166');
    assert.equal(rows[0].status, 'verified');
    assert.equal(rows[0].subtype, 'quality_analysis_form');
    assert.deepEqual(Object.keys(rows[0].meta).sort(), ['title', 'verification_scope']);
  });
  test('the written form number also resolves without changing its identity', async () => {
    const rows = await verify(' gac qa 2610-0166 ');
    assert.equal(rows[0]?.code, 'GAC-QA-2610-0166');
  });
  test('an unissued number is not verified', async () => {
    assert.deepEqual(await verify('GAC-QA-2610-99999999'), []);
  });
});