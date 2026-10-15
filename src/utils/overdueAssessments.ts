export const OVERDUE_DAYS = 3;

export interface PendingLotLike {
  batch_number?: string | null;
  supplier_name?: string | null;
  coffee_type?: string | null;
  kilograms?: number | null;
  bags?: number | null;
  date?: string | null;
  created_at?: string | null;
}

/** Whole days a lot has been waiting since its delivery date (falls back to created_at). */
export function daysPending(lot: PendingLotLike, now: Date = new Date()): number {
  const src = lot.date || lot.created_at;
  if (!src) return 0;
  const d = new Date(src.length === 10 ? `${src}T00:00:00` : src);
  if (isNaN(d.getTime())) return 0;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((today - start) / 86400000));
}

/** A lot is overdue once it has waited more than 3 days. */
export const isOverdue = (lot: PendingLotLike, now?: Date) => daysPending(lot, now) > OVERDUE_DAYS;

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function printOverdueAssessments(lots: PendingLotLike[]) {
  const rows = lots
    .filter((l) => isOverdue(l))
    .sort((a, b) => daysPending(b) - daysPending(a));
  const totalKg = rows.reduce((s, r) => s + Number(r.kilograms || 0), 0);
  const totalBags = rows.reduce((s, r) => s + Number(r.bags || 0), 0);
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><title>Overdue Pending Assessments</title>
<style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#000;font-size:11px}
h1{margin:0;font-size:20px}h2{font-size:15px;margin:14px 0 4px}.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:8px}
table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #000;padding:4px}th{background:#eee}
td.n{text-align:right}.sig{display:flex;justify-content:space-between;margin-top:40px}.sig div{width:30%;border-top:1px solid #000;padding-top:4px;text-align:center}</style>
</head><body><div class="hdr"><h1>GREAT AGRO COFFEE</h1>
<div>A member of Hello YEDA COFFEE COMPANY LIMITED</div><div>P.O Box 431420, Kasese, Uganda</div></div>
<h2>Overdue Pending Quality Assessments (more than ${OVERDUE_DAYS} days)</h2>
<div>Printed: ${esc(new Date().toLocaleString('en-GB'))} &nbsp;|&nbsp; Lots: ${rows.length} &nbsp;|&nbsp; ${totalBags} bags &nbsp;|&nbsp; ${totalKg.toLocaleString()} kg</div>
<table><thead><tr><th>#</th><th>Batch</th><th>Date</th><th>Supplier</th><th>Type</th><th>Bags</th><th>Kg</th><th>Days pending</th><th>Reason for delay / action</th></tr></thead><tbody>
${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.batch_number)}</td><td>${esc(r.date)}</td><td>${esc(r.supplier_name)}</td><td>${esc(r.coffee_type)}</td><td class="n">${esc(r.bags)}</td><td class="n">${Number(r.kilograms || 0).toLocaleString()}</td><td class="n"><b>${daysPending(r)}</b></td><td style="width:22%"></td></tr>`).join('') || '<tr><td colspan="9" style="text-align:center">No overdue lots</td></tr>'}
</tbody></table>
<div class="sig"><div>Quality Analyst</div><div>Quality Manager</div><div>Operations / Admin</div></div>
<script>window.onload=()=>{window.print()}</script></body></html>`);
  w.document.close();
  return true;
}
