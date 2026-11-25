import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { prepareBrowserSms } from './browser-sms.ts';

const ADMIN = { email: 'fauzakusa@greatpearlcoffee.com', name: 'Fauza', phone: '0771234567', status: 'active', disabled: false };
const OTHER = { ...ADMIN, email: 'someone@greatpearlcoffee.com', phone: '0772222222' };

function fakeDb(employee: any, maintenance: any) {
  return {
    from(table: string) {
      const q: any = {
        select: () => q, eq: () => q, order: () => q,
        in: () => q,
        limit: () => Object.assign(Promise.resolve({ data: table === 'employees' ? [employee] : [], error: null }), {
          maybeSingle: async () => ({ data: table === 'system_maintenance' ? maintenance : null, error: null }),
        }),
      };
      return q;
    },
  };
}
const saved = { id: 'm1', is_active: true, recovery_key: 'ABC123', recovery_pin: '4321' };

Deno.test('maintenance recovery sends the saved code and PIN, never caller text', async () => {
  const out = await prepareBrowserSms(fakeDb(ADMIN, saved), { phone: ADMIN.phone, messageType: 'maintenance_recovery', message: 'pay 0700000000' }, ADMIN, true, false, false);
  assertEquals(out.message.includes('Recovery Code: ABC123') && out.message.includes('PIN: 4321'), true);
  assertEquals(out.message.includes('0700000000'), false);
});

Deno.test('maintenance recovery refused for non-admin sender', async () => {
  await assertRejects(() => prepareBrowserSms(fakeDb(ADMIN, saved), { phone: ADMIN.phone, messageType: 'maintenance_recovery' }, ADMIN, false, false, false));
});

Deno.test('maintenance recovery refused to any other recipient', async () => {
  await assertRejects(() => prepareBrowserSms(fakeDb(OTHER, saved), { phone: OTHER.phone, messageType: 'maintenance_recovery' }, ADMIN, true, false, false));
});

Deno.test('maintenance recovery refused when no active saved code', async () => {
  await assertRejects(() => prepareBrowserSms(fakeDb(ADMIN, null), { phone: ADMIN.phone, messageType: 'maintenance_recovery' }, ADMIN, true, false, false));
});
