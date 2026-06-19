import logo from '@/assets/great-agro-coffee-logo.png';

interface AckData {
  providerName: string;
  phone: string;
  email?: string | null;
  description: string;
  invoiceNumber?: string | null;
  amount: number;
  charges?: number;
  total: number;
  reference: string;
  transactionId?: string | null;
  requestType: 'service_provider' | 'meal_plan';
  processedBy: string;
}

export function printProviderAcknowledgement(d: AckData) {
  const fmt = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;
  const date = new Date().toLocaleString('en-UG', { dateStyle: 'long', timeStyle: 'short' });
  const typeLabel = d.requestType === 'meal_plan' ? 'Meal Plan Payment' : 'Service Provider Payment';

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Payment Acknowledgement — ${d.reference}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;margin:0;padding:32px;background:#fff;font-size:13px;line-height:1.5}
  .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #166534;padding-bottom:14px;margin-bottom:18px}
  .header img{height:64px;width:auto}
  .company h1{margin:0;font-size:20px;color:#166534;letter-spacing:.3px}
  .company p{margin:2px 0;font-size:11px;color:#555}
  .meta{display:flex;justify-content:space-between;margin:14px 0 18px;font-size:12px}
  .title{text-align:center;font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:14px 0;background:#f1f5f9;padding:8px;border-radius:4px}
  .ref{text-align:center;font-family:monospace;font-size:14px;color:#166534;margin-bottom:18px;font-weight:700}
  table{width:100%;border-collapse:collapse;margin:10px 0}
  td{padding:8px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top}
  td.label{font-weight:600;width:35%;color:#374151;background:#fafafa}
  .total td{border-top:2px solid #166534;border-bottom:2px solid #166534;font-weight:700;font-size:14px;color:#166534;background:#f0fdf4}
  .declaration{margin-top:22px;padding:12px;border:1px dashed #94a3b8;border-radius:6px;font-size:12px;background:#fafafa}
  .signatures{display:flex;gap:40px;margin-top:36px}
  .sig{flex:1}
  .sig .line{border-bottom:1px solid #111;height:46px;margin-bottom:6px}
  .sig .lbl{font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px}
  .footer{margin-top:30px;text-align:center;font-size:10px;color:#777;border-top:1px solid #e5e7eb;padding-top:10px}
  @media print { body{padding:18px} .no-print{display:none} }
  .actions{margin-top:18px;text-align:center}
  .actions button{background:#166534;color:#fff;border:0;padding:10px 22px;font-size:13px;border-radius:4px;cursor:pointer;margin:0 4px}
</style></head><body>
<div class="header">
  <img src="${logo}" alt="Great Agro Coffee" />
  <div class="company">
    <h1>GREAT AGRO COFFEE LTD</h1>
    <p>A Member of Hello YEDA Coffee Company Limited</p>
    <p>P.O Box 431420, Kasese, Uganda</p>
    <p>Email: info@greatpearlcoffee.com • Tel: +256 393 001 626</p>
  </div>
</div>

<div class="meta">
  <div><strong>Date:</strong> ${date}</div>
  <div><strong>Document:</strong> Payment Acknowledgement</div>
</div>

<div class="title">${typeLabel} — Acknowledgement of Receipt</div>
<div class="ref">Ref: ${d.reference}</div>

<table>
  <tr><td class="label">Provider / Recipient Name</td><td>${d.providerName}</td></tr>
  <tr><td class="label">Phone (Mobile Money)</td><td>${d.phone}</td></tr>
  ${d.email ? `<tr><td class="label">Email</td><td>${d.email}</td></tr>` : ''}
  <tr><td class="label">Service / Description</td><td>${d.description}</td></tr>
  ${d.invoiceNumber ? `<tr><td class="label">Invoice / Reference No.</td><td>${d.invoiceNumber}</td></tr>` : ''}
  <tr><td class="label">Amount</td><td>${fmt(d.amount)}</td></tr>
  ${d.charges ? `<tr><td class="label">Withdraw Charges</td><td>${fmt(d.charges)}</td></tr>` : ''}
  <tr class="total"><td class="label">TOTAL PAID</td><td>${fmt(d.total)}</td></tr>
  <tr><td class="label">Payment Method</td><td>Mobile Money (Yo Payments)</td></tr>
  ${d.transactionId ? `<tr><td class="label">Transaction ID</td><td style="font-family:monospace;font-size:11px">${d.transactionId}</td></tr>` : ''}
  <tr><td class="label">Approved By</td><td>${d.processedBy}</td></tr>
</table>

<div class="declaration">
  <strong>Declaration:</strong> I, the undersigned, acknowledge having received the above sum from
  Great Agro Coffee Ltd in full and final settlement of the service/goods described above.
  I confirm the amount, reference, and details are correct and that I have no further claim
  against the company in respect of this payment.
</div>

<div class="signatures">
  <div class="sig"><div class="line"></div><div class="lbl">Provider Signature & Date</div></div>
  <div class="sig"><div class="line"></div><div class="lbl">Authorised By (Finance) & Date</div></div>
</div>

<div class="footer">
  Great Agro Coffee Ltd — A Member of Hello YEDA Coffee Company Limited — P.O Box 431420, Kasese, Uganda. System-generated document. Ref ${d.reference} • ${date}
</div>

<div class="actions no-print">
  <button onclick="window.print()">Print</button>
  <button onclick="window.close()" style="background:#6b7280">Close</button>
</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 500);
}