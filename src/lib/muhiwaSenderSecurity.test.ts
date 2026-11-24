import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

function retiredSender() {
  let handle: ((req: Request) => Promise<Response>) | undefined;
  let outboundCalls = 0;
  new Script(readFileSync('supabase/functions/send-muhiwa-price/index.ts', 'utf8')).runInNewContext({
    Response,
    Deno: { serve: (fn: typeof handle) => { handle = fn; } },
    fetch: () => { outboundCalls++; throw new Error('Unexpected outbound message'); },
  });
  if (!handle) throw new Error('Missing sender');
  return { handle, calls: () => outboundCalls };
}

for (const authorization of ['', 'Bearer public-key', 'Bearer privileged-session']) {
  test(`retired sender cannot send chosen SMS with ${authorization || 'no authorization'}`, async () => {
    const sender = retiredSender();
    const response = await sender.handle(new Request('https://example.test', {
      method: 'POST', headers: { authorization },
      body: JSON.stringify({ phone: '256700000001', name: 'Chosen recipient', message: 'Caller chosen message' }),
    }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, false);
    assert.equal(sender.calls(), 0);
  });
}

test('retired sender cannot send its old default price notice', async () => {
  const sender = retiredSender();
  const response = await sender.handle(new Request('https://example.test', { method: 'POST', body: '{}' }));
  assert.equal((await response.json()).ok, false);
  assert.equal(sender.calls(), 0);
});

test('retired sender preflight has no outbound effects', async () => {
  const sender = retiredSender();
  const response = await sender.handle(new Request('https://example.test', { method: 'OPTIONS' }));
  assert.equal(response.status, 200);
  assert.equal(sender.calls(), 0);
});