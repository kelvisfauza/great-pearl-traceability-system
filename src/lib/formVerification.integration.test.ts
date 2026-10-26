import { describe, expect, test } from 'bun:test';

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
  expect(response.status).toBe(200);
  return response.json();
}

describe('Issued printed form verification', () => {
  test('the existing printed quality form verifies anonymously', async () => {
    const rows = await verify('GAC-QA-2610-0166');
    expect(rows).toHaveLength(1);
    expect(rows[0].reference_no).toBe('GAC QA 2610-0166');
    expect(rows[0].status).toBe('verified');
    expect(rows[0].subtype).toBe('quality_analysis_form');
    expect(Object.keys(rows[0].meta).sort()).toEqual(['title', 'verification_scope']);
  });
  test('the written form number also resolves without changing its identity', async () => {
    const rows = await verify(' gac qa 2610-0166 ');
    expect(rows[0]?.code).toBe('GAC-QA-2610-0166');
  });
  test('an unissued number is not verified', async () => {
    expect(await verify('GAC-QA-2610-99999999')).toEqual([]);
  });
});