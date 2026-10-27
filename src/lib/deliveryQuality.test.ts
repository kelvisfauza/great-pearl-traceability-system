import { it } from 'node:test';
import { strict as assert } from 'node:assert';
import { savedDeliveryQuality, type DeliveryQuality } from './deliveryQuality';

const record = { id: 'delivery-1', batch_number: 'B-1' };
const assessment: DeliveryQuality = {
  store_record_id: record.id, batch_number: record.batch_number, moisture: 14,
  final_price: 8200, suggested_price: 7800, calculator_price: 7600,
  group1_defects: 2, group2_defects: null, fm: 0, pods: null, husks: null,
  stones: null, updated_at: '2026-10-27',
};
it('leaves unassessed delivery figures empty instead of fabricated defaults', () => {
  assert.deepEqual(savedDeliveryQuality(record, []), { moistureContent: null, defects: null, pricePerKg: null });
});
it('uses saved moisture, individual defects and authoritative per-kg final price', () => {
  assert.deepEqual(savedDeliveryQuality(record, [assessment]), { moistureContent: 14, defects: 'GP1: 2%, FM: 0%', pricePerKg: 8200 });
});
it('falls back to the saved suggested price when final price is absent', () => {
  assert.equal(savedDeliveryQuality(record, [{ ...assessment, final_price: null }]).pricePerKg, 7800);
});
it('does not link a different delivery just because the batch matches', () => {
  assert.equal(savedDeliveryQuality(record, [{ ...assessment, store_record_id: 'other' }]).moistureContent, null);
});
it('supports unique legacy batch references but rejects ambiguous ones', () => {
  const legacy = { ...assessment, store_record_id: null };
  assert.equal(savedDeliveryQuality(record, [legacy]).moistureContent, 14);
  assert.equal(savedDeliveryQuality(record, [legacy, { ...legacy, moisture: 15 }]).moistureContent, null);
});
it('takes the latest explicitly linked assessment and preserves zero values', () => {
  assert.equal(savedDeliveryQuality(record, [assessment, { ...assessment, updated_at: '2026-10-28', final_price: 0 }]).pricePerKg, 0);
});