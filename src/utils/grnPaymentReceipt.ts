import { LOGO_URL } from '@/utils/companyBrand';
import { getGrnScanQrUrl, getGrnScanUrl } from '@/utils/grnScanUrl';

export interface GrnReceiptData {
  grnNumber: string;
  supplierName: string;
  coffeeType?: string | null;
  quantityKg: number;
  unitPrice: number;
  amount: number;
  method: string;
  paidAt: string;
  paidBy: string;
  notes?: string | null;
  receiptNo: string;
}

const money = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;

export function printGrnPaymentReceipt(d: GrnReceiptData) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Payment Receipt ${d.receiptNo}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:18mm 14mm;font-size:12px}
    header{display:flex;align-items:center;gap:12px;border-bottom:2px solid #14532d;padding-bottom:10px}
    header img{height:56px}
    h1{margin:0;font-size:17px;color:#14532d}
    .sub{font-size:10px;color:#555;margin:2px 0}
    .badge{margin-left:auto;text-align:right}
    .badge strong{display:block;color:#14532d;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:14px}
    th,td{border:1px solid #d7ddd6;padding:6px 8px;text-align:left}
    th{background:#f1f5f0;width:26%;font-size:11px}
    .total{margin-top:14px;background:#14532d;color:#fff;padding:10px 12px;font-size:15px;font-weight:bold;display:flex;justify-content:space-between}
    .signs{display:flex;gap:16px;margin-top:34px}
    .signs div{flex:1;text-align:center}
    .signs span{display:block;border-bottom:1px solid #333;height:34px}
    .signs p{margin:4px 0 0;font-size:10px;font-weight:bold}
    footer{margin-top:26px;display:flex;align-items:center;gap:14px;border-top:1px dashed #999;padding-top:10px;font-size:9.5px;color:#555}
    @page{size:A4;margin:0}
  </style></head><body>
    <header>
      <img src="${LOGO_URL}" alt="Great Agro Coffee"/>
      <div>
        <h1>GREAT AGRO COFFEE LIMITED</h1>
        <p class="sub">A Member of YEDA Coffee Company Limited</p>
        <p class="sub">P.O Box 431420, Kasese, Uganda · Tel: +256 393 001 626 / +256 393 101 103</p>
      </div>
      <div class="badge">
        <strong>PAYMENT RECEIPT</strong>
        <span>${d.receiptNo}</span>
      </div>
    </header>

    <table>
      <tr><th>GRN / Batch</th><td>${d.grnNumber}</td></tr>
      <tr><th>Supplier</th><td>${d.supplierName}</td></tr>
      <tr><th>Coffee type</th><td>${d.coffeeType || '—'}</td></tr>
      <tr><th>Quantity</th><td>${Number(d.quantityKg || 0).toLocaleString()} kg @ ${money(d.unitPrice)}/kg</td></tr>
      <tr><th>Payment method</th><td>${d.method}</td></tr>
      <tr><th>Paid on</th><td>${new Date(d.paidAt).toLocaleString('en-GB')}</td></tr>
      <tr><th>Paid by</th><td>${d.paidBy}</td></tr>
      ${d.notes ? `<tr><th>Notes</th><td>${d.notes}</td></tr>` : ''}
    </table>

    <div class="total"><span>TOTAL PAID</span><span>${money(d.amount)}</span></div>

    <div class="signs">
      <div><span></span><p>Received by (Supplier)</p></div>
      <div><span></span><p>Paid by (Finance)</p></div>
      <div><span></span><p>Authorised by</p></div>
    </div>

    <footer>
      <img src="${getGrnScanQrUrl(d.grnNumber, 90)}" alt="GRN" style="width:90px;height:90px" />
      <div>
        Scan to open this GRN in the system.<br/>
        ${getGrnScanUrl(d.grnNumber)}<br/>
        System-generated receipt — Great Agro Coffee Traceability System.
      </div>
    </footer>
  </body></html>`;

  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}
