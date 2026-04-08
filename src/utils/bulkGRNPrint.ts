/**
 * Generates a single print window containing multiple GRN documents,
 * each separated by a page break.
 */

interface GRNData {
  grnNumber: string;
  supplierName: string;
  coffeeType: string;
  numberOfBags: number;
  totalKgs: number;
  unitPrice: number;
  assessedBy: string;
  createdAt: string;
  moisture?: number;
  group1_defects?: number;
  group2_defects?: number;
  below12?: number;
  pods?: number;
  husks?: number;
  stones?: number;
  outturn?: number;
  calculatorComments?: string;
  isDiscretionBuy?: boolean;
  rejectionReason?: string;
  printedBy?: string;
  verificationCode?: string;
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    return convert(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + convert(n % 1000000) : '');
  };
  return convert(Math.floor(num)) + ' Shillings Only';
}

function generateSingleGRNHTML(g: GRNData): string {
  const totalAmount = g.totalKgs * g.unitPrice;
  const dateObj = new Date(g.createdAt);
  const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formattedTime = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const qualityRows = [
    { param: 'Moisture Content', std: '≤ 14%', val: g.moisture, unit: '%' },
    { param: 'Group 1 Defects', std: '≤ 4%', val: g.group1_defects, unit: '%' },
    { param: 'Group 2 Defects', std: '≤ 17%', val: g.group2_defects, unit: '%' },
    { param: 'Below Screen 12', std: '≤ 2%', val: g.below12, unit: '%' },
    { param: 'Total Foreign Matter', std: '≤ 5%', val: (g.pods != null && g.husks != null && g.stones != null) ? g.pods + g.husks + g.stones : undefined, unit: '%' },
    { param: 'Pods', std: '—', val: g.pods, unit: '%' },
    { param: 'Husks', std: '—', val: g.husks, unit: '%' },
    { param: 'Stones/Foreign Matter', std: '—', val: g.stones, unit: '%' },
  ].map(r => `<tr><td>${r.param}</td><td class="grn-td-center">${r.std}</td><td class="grn-td-center">${r.val != null ? r.val + r.unit : 'N/A'}</td></tr>`).join('');

  const qrBlock = g.verificationCode
    ? `<div class="grn-qr-block">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(g.verificationCode)}" alt="QR" class="grn-qr" />
        <p class="grn-qr-label">Scan to Verify</p>
        <p class="grn-qr-code">${g.verificationCode}</p>
      </div>` : '';

  const discretionBanner = g.isDiscretionBuy
    ? `<div class="grn-discretion-banner">
        <div class="grn-discretion-icon">⚠️</div>
        <div class="grn-discretion-content">
          <strong>REJECTED LOT — ADMIN DISCRETION PURCHASE</strong>
          <p>This coffee was rejected during quality assessment but purchased at admin discretion.</p>
          ${g.rejectionReason ? `<p><strong>Rejection Reason:</strong> ${g.rejectionReason}</p>` : ''}
          <p><strong>Discretion Price:</strong> UGX ${g.unitPrice.toLocaleString()}/kg</p>
        </div>
      </div>` : '';

  const outturnBanner = (g.outturn != null)
    ? `<div class="grn-outturn-banner">Outturn: <strong>${g.outturn}%</strong></div>` : '';

  return `
    <div class="grn-page">
      <div class="grn-header">
        <div class="grn-header-row">
          <div class="grn-logo-block"><div class="grn-logo-wrapper"><img src="/lovable-uploads/great-agro-coffee-logo.png" alt="Logo" class="grn-logo" /></div></div>
          <div class="grn-company-block">
            <h1 class="grn-company-name">GREAT AGRO COFFEE LTD</h1>
            <p class="grn-motto">Kasese, Uganda.</p>
            <p class="grn-contacts">Tel: +256 393 001 626 | Email: info@greatpearlcoffee.com</p>
          </div>
          ${qrBlock}
        </div>
        <div class="grn-title-bar"><span class="grn-title-text">GOODS RECEIVED NOTE (GRN)</span></div>
      </div>

      ${discretionBanner}

      <div class="grn-doc-info">
        <table class="grn-info-table"><tbody>
          <tr><td class="grn-info-label">GRN Number:</td><td class="grn-info-value">${g.grnNumber}</td><td class="grn-info-label">Date:</td><td class="grn-info-value">${formattedDate}</td></tr>
          <tr><td class="grn-info-label">Time Received:</td><td class="grn-info-value">${formattedTime}</td><td class="grn-info-label">Assessed By:</td><td class="grn-info-value">${g.assessedBy}</td></tr>
        </tbody></table>
      </div>

      <div class="grn-section">
        <div class="grn-section-header">SUPPLIER DETAILS</div>
        <table class="grn-info-table"><tbody>
          <tr><td class="grn-info-label">Supplier Name:</td><td class="grn-info-value" colspan="3">${g.supplierName}</td></tr>
        </tbody></table>
      </div>

      <div class="grn-section">
        <div class="grn-section-header">GOODS DESCRIPTION</div>
        <table class="grn-goods-table">
          <thead><tr>
            <th class="grn-th-no">#</th><th class="grn-th-desc">Description</th><th class="grn-th-type">Coffee Type</th>
            <th class="grn-th-bags">Bags</th><th class="grn-th-weight">Weight (kg)</th><th class="grn-th-rate">Rate/kg (UGX)</th><th class="grn-th-amount">Amount (UGX)</th>
          </tr></thead>
          <tbody><tr>
            <td class="grn-td-center">1</td>
            <td>${g.isDiscretionBuy ? 'Raw Coffee Beans (REJECTED — Discretion Buy)' : 'Raw Coffee Beans'}</td>
            <td class="grn-td-center">${g.coffeeType}</td>
            <td class="grn-td-center">${g.numberOfBags}</td>
            <td class="grn-td-right">${g.totalKgs.toLocaleString()}</td>
            <td class="grn-td-right">${g.unitPrice.toLocaleString()}</td>
            <td class="grn-td-right grn-td-bold">${totalAmount.toLocaleString()}</td>
          </tr></tbody>
          <tfoot><tr class="grn-total-row">
            <td colspan="3" class="grn-td-right grn-td-bold">TOTAL</td>
            <td class="grn-td-center grn-td-bold">${g.numberOfBags}</td>
            <td class="grn-td-right grn-td-bold">${g.totalKgs.toLocaleString()}</td>
            <td></td>
            <td class="grn-td-right grn-td-bold grn-grand-total">UGX ${totalAmount.toLocaleString()}</td>
          </tr></tfoot>
        </table>
        <div class="grn-amount-words"><strong>Amount in Words:</strong> ${numberToWords(totalAmount)}</div>
      </div>

      <div class="grn-section">
        <div class="grn-section-header">QUALITY ASSESSMENT REPORT</div>
        ${outturnBanner}
        <table class="grn-quality-table">
          <thead><tr><th class="grn-qt-param">Parameter</th><th class="grn-qt-std">Standard</th><th class="grn-qt-result">Result</th></tr></thead>
          <tbody>${qualityRows}</tbody>
        </table>
        ${g.calculatorComments ? `<div class="grn-calculator-comments"><strong>Quality Notes:</strong> ${g.calculatorComments}</div>` : ''}
      </div>

      <div class="grn-section">
        <div class="grn-section-header">REMARKS / OBSERVATIONS</div>
        <div class="grn-remarks-box"><p>Coffee received and inspected as per the quality parameters above.</p></div>
      </div>

      <div class="grn-section">
        <div class="grn-section-header">AUTHORISATION</div>
        <div class="grn-signatures">
          <div class="grn-sig-col"><p class="grn-sig-role">Delivered By (Supplier)</p><div class="grn-sig-space"></div><div class="grn-sig-line"></div><p class="grn-sig-details">Name: _____________________</p><p class="grn-sig-details">Signature: __________________</p><p class="grn-sig-details">Date: ______________________</p></div>
          <div class="grn-sig-col"><p class="grn-sig-role">Received By (Store Keeper)</p><div class="grn-sig-space"></div><div class="grn-sig-line"></div><p class="grn-sig-details">Name: _____________________</p><p class="grn-sig-details">Signature: __________________</p><p class="grn-sig-details">Date: ______________________</p></div>
          <div class="grn-sig-col"><p class="grn-sig-role">Quality Analyst</p><div class="grn-sig-space"></div><div class="grn-sig-line"></div><p class="grn-sig-details">Name: ${g.assessedBy}</p><p class="grn-sig-details">Signature: __________________</p><p class="grn-sig-details">Date: ${formattedDate}</p></div>
          <div class="grn-sig-col"><p class="grn-sig-role">Authorised By (Manager)</p><div class="grn-sig-space"></div><div class="grn-sig-line"></div><p class="grn-sig-details">Name: _____________________</p><p class="grn-sig-details">Signature: __________________</p><p class="grn-sig-details">Date: ______________________</p></div>
        </div>
      </div>

      <div class="grn-footer">
        <div class="grn-footer-left">
          <p>This is a system-generated document.</p>
          <p>Great Agro Coffee — Management System</p>
          ${g.printedBy ? `<p><strong>Printed by:</strong> ${g.printedBy}</p>` : ''}
        </div>
        <div class="grn-footer-right">
          ${g.verificationCode ? `<p>Verify: greatagrocoffee.com/verify/${g.verificationCode}</p>` : ''}
          <p>Printed: ${new Date().toLocaleDateString('en-GB')}</p>
        </div>
      </div>
    </div>
  `;
}

function getGRNPrintStyles(): string {
  return `
    @page { margin: 12mm 14mm; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .grn-page { page-break-after: always; }
    .grn-page:last-child { page-break-after: auto; }
    .grn-header { margin-bottom: 10px; }
    .grn-header-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 3px double #000; }
    .grn-logo-block { flex-shrink: 0; }
    .grn-logo-wrapper { background: #000; padding: 6px 12px; border-radius: 4px; }
    .grn-logo { height: 36px !important; width: auto !important; display: block !important; }
    .grn-company-block { text-align: center; flex: 1; padding: 0 12px; }
    .grn-company-name { font-size: 16px; font-weight: 900; color: #000; letter-spacing: 1.5px; margin-bottom: 1px; }
    .grn-motto { font-size: 8px; color: #000; font-style: italic; margin-bottom: 2px; }
    .grn-contacts { font-size: 8px; color: #000; }
    .grn-qr-block { text-align: center; flex-shrink: 0; }
    .grn-qr { width: 64px !important; height: 64px !important; display: block !important; margin: 0 auto; }
    .grn-qr-label { font-size: 6px; color: #000; margin-top: 2px; }
    .grn-qr-code { font-family: 'Courier New', monospace; font-size: 8px; font-weight: bold; color: #000; }
    .grn-title-bar { background: #000; color: #fff; text-align: center; padding: 6px 0; margin-top: 8px; border-radius: 3px; }
    .grn-title-text { font-size: 14px; font-weight: 700; letter-spacing: 3px; }
    .grn-doc-info { margin: 8px 0; border: 1px solid #000; border-radius: 3px; overflow: hidden; }
    .grn-info-table { width: 100%; border-collapse: collapse; }
    .grn-info-table td { padding: 4px 8px; border: 1px solid #000; font-size: 10px; color: #000; font-weight: 500; }
    .grn-info-label { background: #e8e8e8; font-weight: 700; color: #000; width: 18%; white-space: nowrap; }
    .grn-info-value { color: #000; width: 32%; font-weight: 600; }
    .grn-discretion-banner { display: flex; align-items: flex-start; gap: 8px; margin: 8px 0; padding: 8px 12px; border: 2px solid #c00; border-radius: 4px; background: #fff0f0; }
    .grn-discretion-icon { font-size: 18px; flex-shrink: 0; }
    .grn-discretion-content { font-size: 9px; color: #900; line-height: 1.5; }
    .grn-discretion-content strong { color: #600; }
    .grn-discretion-content p { margin: 1px 0; }
    .grn-section { margin: 8px 0; }
    .grn-section-header { background: #e8e8e8; border-left: 4px solid #000; padding: 4px 10px; font-size: 10px; font-weight: 700; color: #000; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .grn-goods-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .grn-goods-table th { background: #000; color: #fff; padding: 5px 6px; text-align: left; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }
    .grn-goods-table td { padding: 6px; border: 1px solid #000; color: #000; font-weight: 600; }
    .grn-th-no { width: 5%; text-align: center !important; }
    .grn-th-desc { width: 22%; }
    .grn-th-type { width: 14%; text-align: center !important; }
    .grn-th-bags { width: 9%; text-align: center !important; }
    .grn-th-weight { width: 14%; text-align: right !important; }
    .grn-th-rate { width: 16%; text-align: right !important; }
    .grn-th-amount { width: 20%; text-align: right !important; }
    .grn-td-center { text-align: center; }
    .grn-td-right { text-align: right; }
    .grn-td-bold { font-weight: 800; }
    .grn-total-row { background: #e8e8e8; border-top: 2px solid #000; }
    .grn-grand-total { font-size: 12px; color: #000; font-weight: 800; }
    .grn-amount-words { margin-top: 4px; padding: 4px 8px; background: #fff; border: 1px dashed #000; border-radius: 2px; font-size: 10px; font-style: italic; color: #000; font-weight: 600; }
    .grn-outturn-banner { text-align: center; padding: 5px; background: #e8e8e8; border: 1px solid #000; border-radius: 3px; font-size: 12px; color: #000; font-weight: 600; margin-bottom: 4px; }
    .grn-quality-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .grn-quality-table th { background: #e8e8e8; border: 1px solid #000; padding: 4px 8px; font-weight: 700; font-size: 9px; text-transform: uppercase; color: #000; }
    .grn-quality-table td { border: 1px solid #000; padding: 4px 8px; color: #000; font-weight: 500; }
    .grn-qt-param { text-align: left; width: 50%; }
    .grn-qt-std { text-align: center; width: 25%; }
    .grn-qt-result { text-align: center; width: 25%; }
    .grn-calculator-comments { margin-top: 4px; padding: 5px 10px; background: #f5f5f5; border: 1px solid #000; border-radius: 2px; font-size: 10px; color: #000; font-weight: 500; }
    .grn-remarks-box { border: 1px solid #000; padding: 6px 10px; min-height: 30px; border-radius: 2px; font-size: 10px; color: #000; font-weight: 500; }
    .grn-signatures { display: flex; justify-content: space-between; gap: 10px; margin-top: 6px; }
    .grn-sig-col { flex: 1; text-align: center; border: 1px solid #000; border-radius: 3px; padding: 6px 4px 8px; }
    .grn-sig-role { font-size: 9px; font-weight: 700; color: #000; text-transform: uppercase; margin-bottom: 2px; }
    .grn-sig-space { height: 28px; }
    .grn-sig-line { border-top: 1px solid #000; margin: 0 8px 4px; }
    .grn-sig-details { font-size: 8px; color: #000; text-align: left; padding: 1px 8px; font-weight: 500; }
    .grn-footer { display: flex; justify-content: space-between; border-top: 2px solid #000; padding-top: 6px; margin-top: 10px; font-size: 7px; color: #000; }
    .grn-footer-left { text-align: left; }
    .grn-footer-right { text-align: right; }
    @media screen { body { padding: 16px; max-width: 210mm; margin: 0 auto; } }
  `;
}

export function openBulkGRNPrintWindow(grnDataList: GRNData[]): void {
  if (grnDataList.length === 0) return;

  const allGRNsHTML = grnDataList.map(g => generateSingleGRNHTML(g)).join('\n');

  const printWindow = window.open('', '', 'width=900,height=1200');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Bulk GRN Print - ${grnDataList.length} documents</title>
        <style>${getGRNPrintStyles()}</style>
      </head>
      <body>
        ${allGRNsHTML}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        <\/script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export type { GRNData };
