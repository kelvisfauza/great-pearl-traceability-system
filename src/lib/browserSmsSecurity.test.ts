import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { prepareBrowserSms } from '../../supabase/functions/_shared/browser-sms';

const owner = { name: 'Saved User', email: 'owner@example.test', phone: '0700000001', status: 'active', disabled: false };
const coworker = { name: 'Coworker', email: 'coworker@example.test', phone: '0700000002', status: 'active', disabled: false };

function database(overrides: Record<string, any[]> = {}) {
  const tables: Record<string, any[]> = {
    employees: [owner, coworker], suppliers: [], field_assessment_suppliers: [], farmer_profiles: [], field_agents: [], service_providers: [], customers: [],
    market_prices: [{ id: 'saved-prices', price_type: 'reference_prices', drugar_local: 14500, sorted_price: 15800 }],
    verification_codes: [{ id: 'saved-code', email: owner.email, phone: owner.phone, code: '1234', expires_at: new Date(Date.now() + 60000).toISOString() }],
    ...overrides,
  };
  return { from(table: string) {
    let rows = [...(tables[table] || [])];
    const chain = {
      select() { return chain; },
      in(key: string, values: string[]) { rows = rows.filter(r => values.includes(r[key])); return chain; },
      eq(key: string, value: unknown) { rows = rows.filter(r => r[key] === value); return chain; },
      ilike(key: string, value: string) { rows = rows.filter(r => String(r[key]).toLowerCase() === value.toLowerCase()); return chain; },
      gt(key: string, value: string) { rows = rows.filter(r => r[key] > value); return chain; },
      order() { return chain; }, limit(n: number) { rows = rows.slice(0, n); return chain; },
      maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }); },
      then(resolve: (value: unknown) => unknown) { return Promise.resolve({ data: rows, error: null }).then(resolve); },
    };
    return chain;
  } };
}

test('ordinary employee cannot send arbitrary text to a coworker', async () => {
  await assert.rejects(() => prepareBrowserSms(database(), { phone: coworker.phone, message: 'Custom text', messageType: 'general' }, owner, false, false, false));
});

test('privileged sender cannot message an unsaved destination', async () => {
  await assert.rejects(() => prepareBrowserSms(database(), { phone: '0700000009', message: 'Custom text' }, owner, true, true, true));
});

test('price notice uses saved station prices instead of injected content', async () => {
  const result = await prepareBrowserSms(database(), { phone: owner.phone, message: 'Injected price 99999', messageType: 'price_update' }, owner, true, true, false);
  assert.ok(result.message.includes('Drugar 14,500'));
  assert.equal(result.message.includes('99999'), false);
  assert.equal(result.requestId, 'saved-prices');
});

test('unapproved price request cannot become a price notice', async () => {
  await assert.rejects(() => prepareBrowserSms(database({ price_approval_requests: [{ id: 'request', status: 'pending' }] }), { phone: owner.phone, requestId: 'request', messageType: 'price_update' }, owner, true, true, false));
});

test('ordinary employee cannot use price type to bypass permission checks', async () => {
  await assert.rejects(() => prepareBrowserSms(database(), { phone: owner.phone, messageType: 'price_update' }, owner, false, false, false));
});

test('price tests cannot be redirected to another saved employee', async () => {
  await assert.rejects(() => prepareBrowserSms(database(), { phone: coworker.phone, messageType: 'price_update_test' }, owner, true, true, false));
});

test('verification notices send saved code and ignore submitted code text', async () => {
  const result = await prepareBrowserSms(database(), { phone: owner.phone, message: 'code 9999', messageType: 'verification' }, owner, false, false, false);
  assert.ok(result.message.includes('1234'));
  assert.equal(result.message.includes('9999'), false);
});

test('expired saved code cannot be resent', async () => {
  await assert.rejects(() => prepareBrowserSms(database({ verification_codes: [{ email: owner.email, phone: owner.phone, code: '1234', expires_at: '2020-01-01' }] }), { phone: owner.phone, messageType: 'verification' }, owner, false, false, false));
});

test('staff cannot resend a coworker code without IT authority', async () => {
  await assert.rejects(() => prepareBrowserSms(database(), { phone: coworker.phone, messageType: 'verification' }, owner, true, false, false));
});

test('privileged notices retain legitimate bounded custom messages to saved recipients', async () => {
  const result = await prepareBrowserSms(database(), { phone: coworker.phone, messageType: 'hr_notification', message: 'Meeting moved to 3 PM.' }, owner, true, false, false);
  assert.equal(result.phone, coworker.phone);
  assert.equal(result.message, 'Meeting moved to 3 PM.');
});

test('guarantor notice is bound to the saved borrower and guarantor', async () => {
  const db = database({ loans: [{ id: 'loan', employee_email: owner.email, employee_name: owner.name, guarantor_email: coworker.email, guarantor_phone: coworker.phone, guarantor_approval_code: '654321', guarantor_approved: false, loan_amount: 50000, duration_months: 2, status: 'pending_guarantor' }] });
  const result = await prepareBrowserSms(db, { phone: coworker.phone, messageType: 'loan_guarantor_request', message: 'Injected code 999999' }, owner, false, false, false);
  assert.ok(result.message.includes('654321'));
  assert.ok(result.message.includes('50,000'));
  assert.equal(result.message.includes('999999'), false);
});