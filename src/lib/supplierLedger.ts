export type LedgerLine = {
  date: string;
  kind: 'delivery' | 'payment' | 'opening';
  description: string;
  kg: number;
  value: number;   // amount owed to supplier for this delivery
  paid: number;    // amount paid
  balance: number; // running amount owed after this line
};

/** Merge deliveries and payments into a dated ledger with running balance owed. */
export function buildSupplierLedger(
  opening: number,
  deliveries: { date: string; kg: number; value: number; description: string }[],
  payments: { date: string; amount: number; description: string }[],
): { lines: LedgerLine[]; totalKg: number; totalValue: number; totalPaid: number; balance: number } {
  const rows: Omit<LedgerLine, 'balance'>[] = [
    ...deliveries.map(d => ({ date: d.date, kind: 'delivery' as const, description: d.description, kg: Number(d.kg) || 0, value: Number(d.value) || 0, paid: 0 })),
    ...payments.map(p => ({ date: p.date, kind: 'payment' as const, description: p.description, kg: 0, value: 0, paid: Number(p.amount) || 0 })),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'delivery' ? -1 : 1));
  let bal = Number(opening) || 0;
  const lines: LedgerLine[] = [];
  if (bal) lines.push({ date: '', kind: 'opening', description: 'Opening balance', kg: 0, value: bal, paid: 0, balance: bal });
  let totalKg = 0, totalValue = 0, totalPaid = 0;
  for (const r of rows) {
    bal += r.value - r.paid;
    totalKg += r.kg; totalValue += r.value; totalPaid += r.paid;
    lines.push({ ...r, balance: bal });
  }
  return { lines, totalKg, totalValue, totalPaid, balance: bal };
}
