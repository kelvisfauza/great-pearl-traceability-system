export interface ClearanceBatch { id: string; batch_code: string; coffee_type: string; remaining_kilograms: number }
export function batchClearanceLine(batch: ClearanceBatch, weight = batch.remaining_kilograms, bags = 0) {
  if (!(weight > 0) || weight > batch.remaining_kilograms) throw new Error('Released weight exceeds available batch stock');
  return { batch_id: batch.id, lot_ref: batch.batch_code, coffee_type: batch.coffee_type, weight_kg: weight, bags };
}
export function validateClearanceConfirmation(basis: string, contractId: string, buyer: string, contracts: { id: string; buyer_name: string }[]) {
  if (basis === 'spot') return { basis: 'spot', contractId: null };
  if (basis !== 'contract' || !contracts.some(c => c.id === contractId && c.buyer_name.trim().toLowerCase() === buyer.trim().toLowerCase())) throw new Error('Choose a contract belonging to the clearance buyer');
  return { basis: 'contract', contractId };
}/** Fill a released weight from the oldest batches of a coffee type first (batches must be pre-sorted oldest first). */
export function allocateFromBatches(batches: ClearanceBatch[], coffeeType: string, kg: number) {
  if (!(kg > 0)) throw new Error('Enter the kilograms released');
  const type = coffeeType.trim().toLowerCase();
  const pool = batches.filter(b => b.coffee_type.trim().toLowerCase() === type && b.remaining_kilograms > 0);
  const available = pool.reduce((s, b) => s + b.remaining_kilograms, 0);
  if (kg > available + 1e-9) throw new Error(`Only ${available.toLocaleString()} kg of ${coffeeType} is in stock`);
  const lines: ReturnType<typeof batchClearanceLine>[] = [];
  let left = kg;
  for (const b of pool) {
    if (left <= 1e-9) break;
    const take = Math.round(Math.min(left, b.remaining_kilograms) * 100) / 100;
    lines.push(batchClearanceLine(b, take));
    left = Math.round((left - take) * 100) / 100;
  }
  return lines;
}
