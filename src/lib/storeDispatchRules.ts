export interface DispatchLine { coffee_type: string; bags: number; weight_kg: number; lot_ref?: string }

export function validateDispatch(buyer: string, vehicle: string, items: DispatchLine[]) {
  if (!buyer.trim()) throw new Error('Destination / buyer is required');
  if (!vehicle.trim()) throw new Error('Vehicle / truck number is required');
  if (!items.length) throw new Error('Add at least one coffee line');
  for (const item of items) {
    if (!item.coffee_type.trim() || !Number.isFinite(item.weight_kg) || item.weight_kg <= 0 || !Number.isFinite(item.bags) || item.bags < 0) {
      throw new Error('Each coffee line needs a type, positive weight and non-negative bags');
    }
  }
  return { bags: items.reduce((sum, item) => sum + item.bags, 0), weight: items.reduce((sum, item) => sum + item.weight_kg, 0) };
}

export function dispatchDocumentTitles(row: { form_number: string; delivery_note_number: string }) {
  return [`Store Clearance ${row.form_number}`, `Sales Delivery Note ${row.delivery_note_number}`];
}