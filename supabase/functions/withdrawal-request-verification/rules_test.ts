import { assertEquals, assertMatch } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { deliverWithdrawalCode, withdrawalCodeSms } from './rules.ts';

Deno.test('withdrawal code SMS contains the code, expiry and sharing warning', () => {
  const message = withdrawalCodeSms('Alex Tumwine', '12345');
  assertMatch(message, /Withdrawal code: 12345/);
  assertMatch(message, /Valid for 10 minutes/);
  assertMatch(message, /Do not share/);
});

Deno.test('accepted SMS returns immediately without waiting for email', async () => {
  let emailCalls = 0;
  const result = await deliverWithdrawalCode(
    async () => true,
    async () => { emailCalls++; return true; },
  );
  assertEquals(result, { ok: true, channel: 'sms' });
  assertEquals(emailCalls, 0);
});

Deno.test('failed SMS falls back to email', async () => {
  const result = await deliverWithdrawalCode(async () => false, async () => true);
  assertEquals(result, { ok: true, channel: 'email' });
});

Deno.test('failed SMS and email report no delivery', async () => {
  const result = await deliverWithdrawalCode(async () => false, async () => false);
  assertEquals(result, { ok: false, channel: null });
});
