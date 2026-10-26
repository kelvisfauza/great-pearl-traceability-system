export interface ClearanceBatch { id: string; batch_code: string; coffee_type: string; remaining_kilograms: number }
export function batchClearanceLine(batch: ClearanceBatch, weight = batch.remaining_kilograms, bags = 0) {
  if (!(weight > 0) || weight > batch.remaining_kilograms) throw new Error('Released weight exceeds available batch stock');
  return { batch_id: batch.id, lot_ref: batch.batch_code, coffee_type: batch.coffee_type, weight_kg: weight, bags };
}
export function validateClearanceConfirmation(basis: string, contractId: string, buyer: string, contracts: { id: string; buyer_name: string }[]) {
  if (basis === 'spot') return { basis: 'spot', contractId: null };
  if (basis !== 'contract' || !contracts.some(c => c.id === contractId && c.buyer_name.trim().toLowerCase() === buyer.trim().toLowerCase())) throw new Error('Choose a contract belonging to the clearance buyer');
  return { basis: 'contract', contractId };
}