import { LOGO_URL } from '@/utils/companyBrand';
import { getGrnScanQrUrl, getGrnScanUrl } from '@/utils/grnScanUrl';
import { resolveSignatureBlock } from '@/utils/approverSignatures';

export interface GrnReceiptData {
  grnNumber: string;
  supplierName: string;
  coffeeType?: string | null;
  quantityKg: number;
  unitPrice: number;
  amount: number;
  lotValue?: number;
  previouslyPaid?: number;
  balance?: number;
  method: string;
  paidAt: string;
  paidBy: string;
  paidByPosition?: string | null;
  inputBy?: string | null;
  printedBy?: string | null;
  notes?: string | null;
  receiptNo: string;
  /** Approver who released the payment — their signature is stamped on the receipt */
  approvedBy?: string | null;
  approvedByEmail?: string | null;
}

const money = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;

export function printGrnPaymentReceipt(d: GrnReceiptData) {
  const lotValue = Number(d.lotValue ?? d.amount ?? 0);
  const previouslyPaid = Number(d.previouslyPaid ?? 0);
  const balance = Number(d.balance ?? Math.max(lotValue - previouslyPaid - Number(d.amount || 0), 0));
  const signer = resolveSignatureBlock(d.approvedByEmail, d.approvedBy || d.paidBy);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Payment Receipt ${d.receiptNo}</title>
  <style>
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:18mm 14mm;font-size:12px}
    header{display:flex;align-items:center;gap:12px;border-bottom:2px solid #000;padding-bottom:10px}
    header img{height:56px}
    h1{margin:0;font-size:17px;color:#000}
    .sub{font-size:10px;color:#333;margin:2px 0}
    .badge{margin-left:auto;text-align:right}
    .badge strong{display:block;color:#000;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:14px}
    th,td{border:1px solid #000;padding:6px 8px;text-align:left}
    th{background:#e6e6e6;width:26%;font-size:11px}
    .total{margin-top:14px;background:#000;color:#fff;padding:10px 12px;font-size:15px;font-weight:bold;display:flex;justify-content:space-between}
    .sums{width:100%;border-collapse:collapse;margin-top:14px}
    .sums td{border:1px solid #000;padding:6px 8px}
    .sums td.k{width:74%;font-weight:bold}
    .sums td.v{text-align:right;white-space:nowrap}
    .sums tr.bal td{background:#e6e6e6;font-weight:bold}
    .signs{display:flex;gap:16px;margin-top:34px}
    .signs div{flex:1;text-align:center}
    .signs span{display:block;border-bottom:1px solid #000;height:34px}
    .signs p{margin:4px 0 0;font-size:10px;font-weight:bold}
    footer{margin-top:26px;display:flex;align-items:center;gap:14px;border-top:1px dashed #000;padding-top:10px;font-size:9.5px;color:#333}
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
      <tr><th>Paid by</th><td>${d.paidBy || '—'}${d.paidByPosition ? ` (${d.paidByPosition})` : ''}</td></tr>
      ${d.inputBy ? `<tr><th>Input by</th><td>${d.inputBy}</td></tr>` : ''}
      <tr><th>Printed by</th><td>${d.printedBy || d.paidBy || '—'} · ${new Date().toLocaleString('en-GB')}</td></tr>
      ${d.notes ? `<tr><th>Notes</th><td>${d.notes}</td></tr>` : ''}
    </table>

    <table class="sums">
      <tr><td class="k">Total GRN value</td><td class="v">${money(lotValue)}</td></tr>
      ${previouslyPaid > 0 ? `<tr><td class="k">Previously paid</td><td class="v">${money(previouslyPaid)}</td></tr>` : ''}
      <tr><td class="k">Paid on this receipt</td><td class="v">${money(d.amount)}</td></tr>
      <tr class="bal"><td class="k">BALANCE OUTSTANDING</td><td class="v">${money(balance)}</td></tr>
    </table>

    <div class="total"><span>TOTAL PAID</span><span>${money(d.amount)}</span></div>

    <div class="signs">
      <div><span></span><p>Received by (Supplier)</p></div>
      <div><span></span><p>Paid by (Finance)</p></div>
      <div>
        <span style="position:relative">${signer.signatureUrl ? `<img src="${signer.signatureUrl}" alt="signature" style="height:32px;position:absolute;left:50%;bottom:1px;transform:translateX(-50%)"/>` : ''}</span>
        <p>Authorised by — ${signer.name}<br/><span style="font-weight:normal">${signer.title}</span></p>
      </div>
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

  // Print in-place using a hidden iframe (no new tab/window)
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  };

  iframe.onload = () => {
    try {
      const win = iframe.contentWindow;
      if (!win) return cleanup();
      // Give images (logo / QR) a moment to load before printing
      setTimeout(() => {
        win.focus();
        win.print();
        cleanup();
      }, 400);
    } catch {
      cleanup();
    }
  };

  const doc = iframe.contentWindow?.document;
  if (!doc) return cleanup();
  doc.open();
  doc.write(html);
  doc.close();
}
