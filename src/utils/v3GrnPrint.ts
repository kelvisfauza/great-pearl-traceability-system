import {
  LOGO_URL, COMPANY_NAME, COMPANY_TAGLINE, COMPANY_ADDRESS,
  COMPANY_PHONES, COMPANY_EMAIL, COMPANY_REG,
} from '@/utils/companyBrand';

export interface V3GrnPrintData {
  grn_number: string;
  issued_at?: string | null;
  branch?: string | null;
  supplier_name?: string | null;
  supplier_code?: string | null;
  coffee_type?: string | null;
  processing_type?: string | null;
  bags?: number | null;
  gross_weight?: number | null;
  tare_weight?: number | null;
  net_weight?: number | null;
  unit_price?: number | null;
  total_amount?: number | null;
  moisture?: number | null;
  outturn?: number | null;
  cup_score?: number | null;
  delivery_date?: string | null;
  assessment_date?: string | null;
  store_officer?: string | null;
  quality_officer?: string | null;
  manager?: string | null;
  vehicle?: string | null;
  driver_name?: string | null;
}

const fmt = (n?: number | null, d = 0) =>
  n === null || n === undefined ? '—' : Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

const date = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function copy(g: V3GrnPrintData, label: string) {
  return `
  <section class="copy">
    <header>
      <img src="${LOGO_URL}" alt="${COMPANY_NAME} logo" />
      <div class="org">
        <h1>${COMPANY_NAME}</h1>
        <p>${COMPANY_TAGLINE}</p>
        <p>${COMPANY_ADDRESS} · ${COMPANY_PHONES}</p>
        <p>${COMPANY_EMAIL} · ${COMPANY_REG}</p>
      </div>
      <div class="badge">
        <strong>GOODS RECEIVED NOTE</strong>
        <span>${g.grn_number}</span>
        <em>${label}</em>
      </div>
    </header>

    <table class="kv">
      <tr><th>Supplier</th><td>${g.supplier_name || '—'} ${g.supplier_code ? `(${g.supplier_code})` : ''}</td>
          <th>Branch / Store</th><td>${g.branch || '—'}</td></tr>
      <tr><th>Delivery date</th><td>${date(g.delivery_date)}</td>
          <th>Assessment date</th><td>${date(g.assessment_date)}</td></tr>
      <tr><th>Issued on</th><td>${date(g.issued_at)}</td>
          <th>Printed on</th><td>${new Date().toLocaleString('en-GB')}</td></tr>
      <tr><th>Vehicle</th><td>${g.vehicle || '—'}</td><th>Driver</th><td>${g.driver_name || '—'}</td></tr>
    </table>

    <table class="grid">
      <thead><tr><th>Coffee</th><th>Process</th><th>Bags</th><th>Gross kg</th><th>Tare kg</th><th>Net kg</th><th>Unit price</th><th>Amount (UGX)</th></tr></thead>
      <tbody><tr>
        <td>${g.coffee_type || '—'}</td><td>${g.processing_type || '—'}</td><td>${fmt(g.bags)}</td>
        <td>${fmt(g.gross_weight, 2)}</td><td>${fmt(g.tare_weight, 2)}</td><td><strong>${fmt(g.net_weight, 2)}</strong></td>
        <td>${fmt(g.unit_price, 2)}</td><td><strong>${fmt(g.total_amount, 2)}</strong></td>
      </tr></tbody>
    </table>

    <table class="grid">
      <thead><tr><th>Moisture %</th><th>Outturn %</th><th>Cup score</th></tr></thead>
      <tbody><tr><td>${fmt(g.moisture, 1)}</td><td>${fmt(g.outturn, 1)}</td><td>${fmt(g.cup_score, 1)}</td></tr></tbody>
    </table>

    <div class="signs">
      <div><span></span><p>Store Manager<br/><small>${g.store_officer || 'Input by'}</small></p></div>
      <div><span></span><p>Quality — Physical<br/><small>${g.quality_officer || ''}</small></p></div>
      <div><span></span><p>Quality — System<br/><small>${g.quality_officer || ''}</small></p></div>
      <div><span></span><p>Manager<br/><small>${g.manager || 'Authorising'}</small></p></div>
    </div>
  </section>`;
}

export function printV3Grn(g: V3GrnPrintData) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${g.grn_number}</title>
  <style>
    *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;margin:0;color:#111;font-size:11px}
    .copy{page-break-after:always;padding:14mm 12mm;height:297mm}
    .copy:last-child{page-break-after:auto}
    header{display:flex;gap:10px;align-items:center;border-bottom:2px solid #14532d;padding-bottom:8px}
    header img{height:52px}
    .org h1{margin:0;font-size:16px;color:#14532d;letter-spacing:.5px}
    .org p{margin:1px 0;font-size:9.5px;color:#444}
    .badge{margin-left:auto;text-align:right}
    .badge strong{display:block;font-size:12px;color:#14532d}
    .badge span{display:block;font-size:13px;font-weight:bold}
    .badge em{font-size:9.5px;color:#666}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    .kv th{background:#f1f5f0;text-align:left;width:14%;font-size:9.5px;padding:4px 6px;border:1px solid #d7ddd6}
    .kv td{padding:4px 6px;border:1px solid #d7ddd6;width:36%}
    .grid th{background:#14532d;color:#fff;padding:5px;font-size:9.5px;border:1px solid #14532d}
    .grid td{padding:6px;text-align:center;border:1px solid #d7ddd6}
    .signs{display:flex;gap:10px;margin-top:26px}
    .signs div{flex:1;text-align:center}
    .signs span{display:block;border-bottom:1px solid #333;height:34px}
    .signs p{margin:4px 0 0;font-size:9.5px;font-weight:bold}
    .signs small{font-weight:normal;color:#555}
    @page{size:A4;margin:0}
  </style></head><body>
    ${copy(g, "Supplier's copy")}
    ${copy(g, 'Finance copy')}
    ${copy(g, 'Store copy')}
  </body></html>`;

  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}