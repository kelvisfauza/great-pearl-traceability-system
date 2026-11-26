type Customer = { id: string; full_name: string; phone: string | null; current_balance: number | string };
const phoneKey = (value: unknown) => String(value || '').replace(/\D/g,'').replace(/^0/,'256');
export function validateCollection(phone: unknown, amount: unknown, allocations: { customer_id: string; amount: unknown }[], saved: Customer[]) {
  const total = Number(amount);
  if (!Number.isSafeInteger(total) || total < 500 || allocations.length < 1 || allocations.length > 100) throw new Error('Invalid collection amount or customer allocation');
  if (!/^256\d{9}$/.test(phoneKey(phone)) || !saved.some(row => phoneKey(row.phone) === phoneKey(phone))) throw new Error('The collection phone must belong to a saved paying customer');
  const seen = new Set<string>();
  let sum = 0;
  const verified = allocations.map(row => {
    const customer = saved.find(c => c.id === row.customer_id);
    const value = Number(row.amount);
    if (!customer || seen.has(row.customer_id) || !Number.isSafeInteger(value) || value <= 0 || value > Number(customer.current_balance)) throw new Error('An allocation cannot exceed the saved customer debt');
    seen.add(row.customer_id); sum += value;
    return { customer_id: customer.id, customer_name: customer.full_name, amount: value };
  });
  if (sum !== total) throw new Error('Allocations must match the collection amount');
  return verified;
}