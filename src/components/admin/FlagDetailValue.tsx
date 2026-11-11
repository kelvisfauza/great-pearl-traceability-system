import React from 'react';

const HIDE = new Set(['lot_id','id','fingerprint','record_id','delivery_id','assessment_id','advance_id','batch_id','supplier_id']);
const LABELS: Record<string,string> = {
  delivery_number: 'Delivery number', recorded_at: 'Received at Store', recorded_by: 'Received by',
  quality_price: 'Quality price (per kg)', in_stock_batch: 'Counted in stock', status: 'Stage',
  finance: 'Finance payments', price: 'Price (per kg)', total: 'Total amount', notes: 'Note', kilograms: 'Weight',
};
const STAGES: Record<string,string> = { inventory: 'In stock', assessed: 'Checked by Quality', pending: 'Waiting', paid: 'Paid', unpaid: 'Not paid', ready_for_finance: 'Waiting for Finance payment', submitted_to_finance: 'Sent to Finance', sales: 'Sold' };

const label = (k: string) => LABELS[k] || k.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
const money = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;

function fmt(key: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return 'Not recorded';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') {
    if (/price|total|amount|paid|balance/.test(key)) return money(v);
    if (/kg|kilogram|weight/.test(key)) return `${v.toLocaleString()} kg`;
    return v.toLocaleString();
  }
  const s = String(v);
  if (key === 'status') return STAGES[s.toLowerCase()] || s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return new Date(s).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s).toLocaleDateString('en-GB', { dateStyle: 'medium' });
  if (key === 'notes') return s.replace(/ - Ref: N\/A/g, '').replace(/Amount: ([\d.]+)/, (_, a) => `Amount: ${money(Number(a))}`).replace(/Method: (\w+)/, (_, m) => `Method: ${m.charAt(0) + m.slice(1).toLowerCase()}`);
  return s;
}

export function FlagDetailValue({ name, value }: { name: string; value: unknown }) {
  if (Array.isArray(value)) {
    if (!value.length) return <span>None</span>;
    if (typeof value[0] !== 'object') return <span>{value.map(v => fmt(name, v)).join(', ')}</span>;
    return <div className="space-y-2">{value.map((item, i) => (
      <div key={i} className="rounded-md border bg-muted/30 p-2">
        {name === 'records' && <p className="mb-1 font-medium text-foreground">Copy {i + 1}</p>}
        {name === 'finance' && <p className="mb-1 font-medium text-foreground">Payment {i + 1}</p>}
        <FlagDetailObject obj={item as Record<string, unknown>} />
      </div>))}</div>;
  }
  if (value && typeof value === 'object') return <FlagDetailObject obj={value as Record<string, unknown>} />;
  return <span>{fmt(name, value)}</span>;
}

function FlagDetailObject({ obj }: { obj: Record<string, unknown> }) {
  return <dl className="space-y-1">{Object.entries(obj).filter(([k]) => !HIDE.has(k)).map(([k, v]) => (
    <div key={k} className="grid grid-cols-[minmax(0,40%)_1fr] gap-2"><dt className="text-foreground/80">{label(k)}</dt><dd className="break-words"><FlagDetailValue name={k} value={v} /></dd></div>))}</dl>;
}
