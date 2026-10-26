import { it } from 'node:test';
import { strict as assert } from 'node:assert';
import { validateDispatch, dispatchDocumentTitles } from './storeDispatchRules';

it('a saved clearance produces both numbered documents', () => {
  assert.deepEqual(dispatchDocumentTitles({ form_number: 'SC-2026-000001', delivery_note_number: 'DN-2026-000001' }), ['Store Clearance SC-2026-000001', 'Sales Delivery Note DN-2026-000001']);
});
it('preserves bags and weight across the document pair', () => {
  assert.deepEqual(validateDispatch('Buyer', 'UBD 123A', [{ coffee_type: 'Arabica', bags: 10, weight_kg: 600 }, { coffee_type: 'Robusta', bags: 5, weight_kg: 300 }]), { bags: 15, weight: 900 });
});
it('does not save a clearance without a buyer', () => {
  assert.throws(() => validateDispatch('', 'UBD 123A', [{ coffee_type: 'Arabica', bags: 10, weight_kg: 600 }]), /buyer/);
});
it('does not save zero-weight dispatches', () => {
  assert.throws(() => validateDispatch('Buyer', 'UBD 123A', [{ coffee_type: 'Arabica', bags: 10, weight_kg: 0 }]), /positive weight/);
});