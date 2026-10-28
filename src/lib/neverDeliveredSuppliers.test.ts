import { it } from 'node:test';
import { strict as assert } from 'node:assert';
import { normalizeSupplierName, resolveNeverDeliveredSuppliers } from './neverDeliveredSuppliers';

const suppliers = [
  { id: 's1', name: 'Bwambale Denis', code: 'SUP001', phone: '0770000001', origin: 'Kasese', date_registered: '2026-01-01' },
  { id: 's2', name: 'Jeremiah (GPC 00373)', code: 'SUP002', phone: '0770000002', origin: 'Bundibugyo', date_registered: '2026-06-15' },
  { id: 's3', name: 'Kibaba Nicholus', code: 'SUP003', phone: null, origin: null, date_registered: null },
];

it('lists suppliers with no linked coffee record at all', () => {
  const out = resolveNeverDeliveredSuppliers(suppliers, []);
  assert.deepEqual(out.map(s => s.name), ['Bwambale Denis', 'Jeremiah (GPC 00373)', 'Kibaba Nicholus']);
});

it('matches deliveries by supplier_id and excludes them', () => {
  const out = resolveNeverDeliveredSuppliers(suppliers, [{ supplier_id: 's1', supplier_name: 'Other Name' }]);
  assert.deepEqual(out.map(s => s.id), ['s2', 's3']);
});

it('matches legacy deliveries by normalized name, ignoring code suffixes', () => {
  const out = resolveNeverDeliveredSuppliers(suppliers, [{ supplier_name: 'Jelema' }, { supplier_name: 'Kibaba Nicholus (GPC 00042)' }]);
  // No record matches "Jelema" exactly; the legacy Jeremiah alias is not normalized here.
  assert.deepEqual(out.map(s => s.name).filter(n => n.startsWith('Kibaba')), []);
});

it('counts days since registration and sorts longest-waiting first', () => {
  const out = resolveNeverDeliveredSuppliers(suppliers, [{ supplier_id: 's3' }]);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map(s => s.id), ['s1', 's2']);
  assert.ok(out[0].daysSinceRegistration! > out[1].daysSinceRegistration!);
  assert.ok(out[1].daysSinceRegistration! > 0);
});

it('normalizes legacy code suffixes for comparison', () => {
  assert.equal(normalizeSupplierName('Jeremiah (GPC 00373)'), 'jeremiah');
  assert.equal(normalizeSupplierName('Jeremiah (SUP12)'), 'jeremiah');
  assert.equal(normalizeSupplierName('Jeremiah'), 'jeremiah');
});
