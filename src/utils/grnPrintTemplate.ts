import { getVerificationQRUrl, getVerificationUrl } from "./verificationCode";

export interface GRNDocumentData {
  grnNumber: string;
  supplierName: string;
  coffeeType: string;
  qualityAssessment?: string;
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
  region?: string;
  supplierAddress?: string;
  supplierPhone?: string;
  vehicleReg?: string;
  deliveryNote?: string;
  weighbridgeNo?: string;
  qualityFactor?: string;
  contractNo?: string;
  qualityApprovedBy?: string;
  managerName?: string;
  totalAmount?: number;
}

const LOGO_URL = `${typeof window !== "undefined" ? window.location.origin : ""}/lovable-uploads/great-agro-coffee-logo.png`;

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function displayValue(value: string | number | null | undefined, fallback = "—"): string {
  const text = String(value ?? "").trim();
  return escapeHtml(text || fallback);
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero Shillings Only";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ` ${ones[n % 10]}` : "");
    if (n < 1000) return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` and ${convert(n % 100)}` : ""}`;
    if (n < 1_000_000) return `${convert(Math.floor(n / 1000))} Thousand${n % 1000 ? ` ${convert(n % 1000)}` : ""}`;
    return `${convert(Math.floor(n / 1_000_000))} Million${n % 1_000_000 ? ` ${convert(n % 1_000_000)}` : ""}`;
  };

  return `${convert(Math.floor(num))} Shillings Only`;
}

function checkbox(checked: boolean): string {
  return `<span class="gac-grn-checkbox">${checked ? "✓" : ""}</span>`;
}

function field(label: string, value: string | number | null | undefined, width = "100%") {
  return `
    <span class="gac-grn-field" style="width:${width};">
      <span class="gac-grn-field-label">${label}</span>
      <span class="gac-grn-field-value">${displayValue(value)}</span>
    </span>
  `;
}

export function getGRNDocumentStyles(): string {
  return `
    <style>
      @page { size: A4; margin: 10mm 12mm; }
      .gac-grn-preview-shell {
        background: #f4f4f5;
        padding: 16px;
      }
      .gac-grn-page {
        width: 210mm;
        max-width: 100%;
        margin: 0 auto 16px;
        background: #fffdf7;
        color: #1a1a1a;
        padding: 10px 14px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        box-shadow: 0 0 0 1px #d4d4d8;
        page-break-after: always;
      }
      .gac-grn-page:last-child { page-break-after: auto; }
      .gac-grn-top-table,
      .gac-grn-info-table,
      .gac-grn-pricing-table,
      .gac-grn-sign-table,
      .gac-grn-footer-table,
      .gac-grn-quality-table {
        width: 100%;
        border-collapse: collapse;
      }
      .gac-grn-logo-cell,
      .gac-grn-title-cell,
      .gac-grn-od-cell,
      .gac-grn-sign-cell {
        border: 1.5px solid #1a1a1a;
      }
      .gac-grn-logo-cell {
        width: 18%;
        text-align: center;
        vertical-align: middle;
        padding: 4px 6px;
      }
      .gac-grn-title-cell {
        width: 52%;
        text-align: center;
        vertical-align: middle;
        padding: 6px;
      }
      .gac-grn-od-cell {
        width: 30%;
        font-size: 11.5px;
        line-height: 1.5;
        padding: 4px 6px;
        vertical-align: middle;
      }
      .gac-grn-logo {
        height: 38px;
        width: auto;
        display: block;
        margin: 0 auto 2px;
      }
      .gac-grn-logo-text {
        font-weight: 700;
        font-size: 13px;
        letter-spacing: 1px;
      }
      .gac-grn-official-title {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 1.2px;
      }
      .gac-grn-official-subtitle {
        font-size: 12.5px;
        font-weight: 600;
        margin-top: 1px;
        letter-spacing: 0.8px;
      }
      .gac-grn-company-strip {
        width: 100%;
        margin: 4px 0;
        border-collapse: collapse;
      }
      .gac-grn-company-name {
        font-size: 15px;
        letter-spacing: 1px;
        font-weight: 700;
      }
      .gac-grn-company-tagline {
        font-size: 11px;
        color: #444;
      }
      .gac-grn-ref-label {
        font-size: 13px;
        font-weight: 700;
      }
      .gac-grn-ref-code {
        display: inline-block;
        margin-left: 4px;
        padding: 2px 8px;
        border: 1px solid #c1121f;
        color: #c1121f;
        font-size: 17px;
        font-weight: 700;
        font-family: 'Courier New', monospace;
        letter-spacing: 1px;
      }
      .gac-grn-region-row {
        margin: 6px 0 8px;
        font-size: 11px;
      }
      .gac-grn-checkbox {
        display: inline-block;
        width: 11px;
        height: 11px;
        line-height: 9px;
        text-align: center;
        border: 1.2px solid #1a1a1a;
        margin-right: 4px;
        vertical-align: middle;
        font-size: 10px;
        font-weight: 700;
        color: #0a6b2a;
      }
      .gac-grn-region-label {
        margin-right: 18px;
        font-weight: 600;
      }
      .gac-grn-region-other {
        display: inline-block;
        min-width: 200px;
        margin-left: 4px;
        padding: 0 6px;
        border-bottom: 1px solid #1a1a1a;
        color: #000;
        font-weight: 700;
        font-family: 'Courier New', monospace;
      }
      .gac-grn-preamble,
      .gac-grn-note {
        margin: 4px 12px 6px;
        color: #222;
        line-height: 1.3;
        text-align: center;
      }
      .gac-grn-preamble { font-size: 10.5px; }
      .gac-grn-note { font-size: 10px; color: #333; margin-top: 6px; }
      .gac-grn-detail-grid {
        width: 100%;
        border-collapse: collapse;
        margin: 6px 0 4px;
      }
      .gac-grn-detail-grid td {
        padding: 4px 5px;
        vertical-align: middle;
        font-size: 11.5px;
        white-space: nowrap;
      }
      .gac-grn-detail-row {
        margin: 4px 0;
      }
      .gac-grn-field {
        display: inline-block;
        vertical-align: top;
      }
      .gac-grn-field-label {
        font-weight: 600;
      }
      .gac-grn-field-value {
        display: inline-block;
        min-width: 60px;
        padding: 0 6px;
        border-bottom: 1px solid #1a1a1a;
        color: #000;
        font-weight: 700;
        font-family: 'Courier New', monospace;
      }
      .gac-grn-quality-caption {
        margin: 4px 0 2px;
        color: #444;
        font-size: 10.5px;
        text-align: center;
        font-style: italic;
      }
      .gac-grn-quality-table {
        margin-top: 4px;
        font-size: 11px;
      }
      .gac-grn-quality-table th,
      .gac-grn-quality-table td {
        border: 1px solid #1a1a1a;
        padding: 3px 6px;
      }
      .gac-grn-quality-table th {
        background: #f0efe9;
        font-size: 10.5px;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      .gac-grn-quality-table td:last-child,
      .gac-grn-quality-table td:nth-child(2),
      .gac-grn-quality-table th:last-child,
      .gac-grn-quality-table th:nth-child(2) {
        text-align: center;
      }
      .gac-grn-discretion {
        margin-top: 4px;
        border: 1.5px solid #c1121f;
        background: #fff1f2;
        padding: 3px 6px;
        color: #7f1d1d;
        font-size: 10px;
        line-height: 1.25;
      }
      .gac-grn-discretion strong {
        display: inline;
        margin-bottom: 0;
      }
      .gac-grn-page.has-discretion { font-size: 11.2px; line-height: 1.3; }
      .gac-grn-page.has-discretion .gac-grn-quality-table { font-size: 10.5px; }
      .gac-grn-page.has-discretion .gac-grn-quality-table th,
      .gac-grn-page.has-discretion .gac-grn-quality-table td { padding: 2px 5px; }
      .gac-grn-page.has-discretion .gac-grn-detail-grid td { padding: 2px 4px; font-size: 11px; }
      .gac-grn-page.has-discretion .gac-grn-pricing-table { font-size: 10.8px; }
      .gac-grn-page.has-discretion .gac-grn-pricing-table td { padding: 2px 0; }
      .gac-grn-page.has-discretion .gac-grn-preamble,
      .gac-grn-page.has-discretion .gac-grn-note { margin: 2px 12px; font-size: 9.5px; }
      .gac-grn-pricing-table {
        margin-top: 4px;
        font-size: 11.5px;
      }
      .gac-grn-pricing-table td {
        padding: 3px 0;
        vertical-align: top;
      }
      .gac-grn-line-fill {
        display: inline-block;
        min-width: 90px;
        border-bottom: 1px solid #1a1a1a;
        padding: 0 4px;
      }
      .gac-grn-line-fill-value {
        font-family: 'Courier New', monospace;
        color: #000;
        font-weight: 700;
      }
      .gac-grn-total-row td {
        border-top: 1.5px solid #1a1a1a;
        padding-top: 6px;
      }
      .gac-grn-total-amount {
        border-bottom: 2px solid #1a1a1a;
        font-size: 13.5px;
        font-weight: 700;
      }
      .gac-grn-amount-words {
        margin-top: 4px;
        padding: 3px 8px;
        border: 1px dashed #1a1a1a;
        font-size: 10.5px;
        font-style: italic;
        background: #fff;
      }
      .gac-grn-stamp-wrap {
        position: relative;
        margin: 6px 0;
        text-align: center;
      }
      .gac-grn-stamp {
        display: inline-block;
        padding: 6px 18px;
        border: 2.5px solid #0a6b2a;
        border-radius: 60px;
        color: #0a6b2a;
        font-weight: 700;
        letter-spacing: 1.5px;
        transform: rotate(-6deg);
      }
      .gac-grn-stamp-top { font-size: 10px; }
      .gac-grn-stamp-date { font-size: 13px; margin: 2px 0; }
      .gac-grn-stamp-bottom { font-size: 9px; }
      .gac-grn-supplier-sign {
        margin: 6px 0 2px;
        font-size: 11.5px;
      }
      .gac-grn-sign-line {
        display: inline-block;
        min-width: 380px;
        border-bottom: 1px solid #1a1a1a;
      }
      .gac-grn-sign-cell {
        width: 33.33%;
        padding: 4px 6px;
        font-size: 11px;
      }
      .gac-grn-sign-value {
        display: inline-block;
        width: 90%;
        margin-top: 8px;
        border-bottom: 1px solid #1a1a1a;
        font-family: 'Courier New', monospace;
        color: #000;
        font-weight: 700;
      }
      .gac-grn-footer-table {
        margin-top: 6px;
        border-top: 1.5px solid #1a1a1a;
      }
      .gac-grn-footer-left {
        width: 65%;
        padding: 4px 6px;
        color: #444;
        font-size: 10px;
        line-height: 1.35;
        vertical-align: top;
      }
      .gac-grn-footer-right {
        width: 35%;
        padding: 4px 6px;
        text-align: right;
        vertical-align: top;
      }
      .gac-grn-verify-code {
        display: inline-block;
        margin-top: 4px;
        color: #0a6b2a;
        font-family: 'Courier New', monospace;
        font-weight: 700;
      }
      .gac-grn-qr {
        width: 60px;
        height: 60px;
        border: 1px solid #ccc;
        padding: 2px;
        background: #fff;
      }
      .gac-grn-qr-label {
        margin-top: 2px;
        color: #666;
        font-size: 9.5px;
      }
      .gac-grn-system-note {
        margin-top: 6px;
        color: #888;
        font-size: 10px;
        text-align: center;
        font-style: italic;
      }
      @media print {
        body {
          margin: 0;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .gac-grn-preview-shell {
          background: #fff;
          padding: 0;
        }
        .gac-grn-page {
          margin: 0;
          width: auto;
          max-width: none;
          box-shadow: none;
          background: #fff;
          padding: 0;
        }
      }
    </style>
  `;
}

export function getGRNDocumentMarkup(data: GRNDocumentData): string {
  const createdAt = new Date(data.createdAt);
  const issueDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
  const deliveryDate = createdAt.toLocaleDateString("en-GB");
  const totalAmount = data.totalAmount ?? data.totalKgs * data.unitPrice;
  const grnReference = data.grnNumber.startsWith("GAC-") ? data.grnNumber : `GAC-${data.grnNumber}`;
  const odNo = data.grnNumber.replace(/\D/g, "").slice(-4) || "0001";
  const region = (data.region || "").trim();
  const lowerRegion = region.toLowerCase();
  const isOtherRegion = Boolean(region) && !["elgon", "rwenzori", "masaka"].some((name) => lowerRegion.includes(name));
  const totalForeignMatter = [data.pods, data.husks, data.stones].every((value) => value != null)
    ? Number(data.pods) + Number(data.husks) + Number(data.stones)
    : undefined;
  const verificationUrl = data.verificationCode ? getVerificationUrl(data.verificationCode) : "";
  const qrCodeUrl = data.verificationCode ? getVerificationQRUrl(data.verificationCode, 110) : "";
  const qualityFactor = data.qualityFactor || (data.outturn != null ? `${data.outturn}%` : undefined);
  const qualityRows = [
    ["Moisture Content", data.moisture != null ? `${data.moisture}%` : "—", "≤ 14%"],
    ["Group 1 Defects", data.group1_defects != null ? `${data.group1_defects}%` : "—", "≤ 4%"],
    ["Group 2 Defects", data.group2_defects != null ? `${data.group2_defects}%` : "—", "≤ 17%"],
    ["Below Screen 12", data.below12 != null ? `${data.below12}%` : "—", "≤ 2%"],
    ["Pods", data.pods != null ? `${data.pods}%` : "—", "—"],
    ["Husks", data.husks != null ? `${data.husks}%` : "—", "—"],
    ["Stones / Foreign Matter", data.stones != null ? `${data.stones}%` : "—", "—"],
    ["Total Foreign Matter", totalForeignMatter != null ? `${totalForeignMatter}%` : "—", "≤ 5%"],
  ];

  return `
    <div class="gac-grn-page${data.isDiscretionBuy ? " has-discretion" : ""}">
      <table class="gac-grn-top-table">
        <tr>
          <td class="gac-grn-logo-cell">
            <img src="${LOGO_URL}" alt="Great Agro Coffee" class="gac-grn-logo" />
            <div class="gac-grn-logo-text">GAC</div>
          </td>
          <td class="gac-grn-title-cell">
            <div class="gac-grn-official-title">OFFICIAL DOCUMENT</div>
            <div class="gac-grn-official-subtitle">GOODS RECEIVED NOTE — COFFEE</div>
          </td>
          <td class="gac-grn-od-cell">
            <div><strong>OD No:</strong> ${escapeHtml(odNo)}</div>
            <div><strong>Version No:</strong> 01</div>
            <div><strong>Issue Date:</strong> ${escapeHtml(issueDate)}</div>
          </td>
        </tr>
      </table>

      <table class="gac-grn-company-strip">
        <tr>
          <td style="text-align:center;padding:4px 0;font-size:11px;">
            <strong class="gac-grn-company-name">GREAT AGRO COFFEE LIMITED</strong><br/>
            <span class="gac-grn-company-tagline">A SPECIALTY COFFEE PROCESSOR & EXPORTER</span>
          </td>
          <td style="width:30%;text-align:right;padding:4px 0;white-space:nowrap;">
            <strong class="gac-grn-ref-label">GAC-GRNC</strong>
            <span class="gac-grn-ref-code">${escapeHtml(grnReference)}</span>
          </td>
        </tr>
      </table>

      <p class="gac-grn-preamble">
        This Goods Received Note is a Contract between the two parties mentioned, whereby Great Agro Coffee Limited has agreed to buy
        and the Supplier has agreed to sell coffee under the following terms and conditions. This is to certify that we have received and
        inspected your coffee delivered to us and found it to conform to the following quality and price specifications.
      </p>

      <table class="gac-grn-detail-grid">
        <tr>
          <td style="width:33%;">${field("Date:&nbsp;", deliveryDate)}</td>
          <td style="width:34%;">${field("Supplier&rsquo;s Name:&nbsp;", data.supplierName)}</td>
          <td style="width:33%;"></td>
        </tr>
        <tr>
          <td>${field("Supplier&rsquo;s Address:&nbsp;", data.supplierAddress)}</td>
          <td></td>
          <td>${field("Supplier&rsquo;s Tel:&nbsp;", data.supplierPhone)}</td>
        </tr>
        <tr>
          <td>${field("Vehicle Reg:&nbsp;", data.vehicleReg)}</td>
          <td>${field("Delivery Note No:&nbsp;", data.deliveryNote || data.grnNumber)}</td>
          <td></td>
        </tr>
        <tr>
          <td>${field("No. of Bags:&nbsp;", `${data.numberOfBags} bags`)}</td>
          <td>${field("Weighbridge No:&nbsp;", data.weighbridgeNo)}</td>
          <td>${field("Net Weight (kg):&nbsp;", data.totalKgs.toLocaleString())}</td>
        </tr>
        <tr>
          <td>${field("Type of Coffee:&nbsp;", data.coffeeType)}</td>
          <td>${field("Quality Factor:&nbsp;", qualityFactor)}</td>
          <td>${field("Moisture Content:&nbsp;", data.moisture != null ? `${data.moisture}%` : undefined)}</td>
        </tr>
      </table>

      <div class="gac-grn-quality-caption">Quality Analysis: (Electronic quality summary attached below)</div>

      <table class="gac-grn-quality-table">
        <thead>
          <tr>
            <th>Quality Parameter</th>
            <th>Result</th>
            <th>Reference</th>
          </tr>
        </thead>
        <tbody>
          ${qualityRows.map(([label, value, ref]) => `
            <tr>
              <td>${escapeHtml(label)}</td>
              <td>${escapeHtml(value)}</td>
              <td>${escapeHtml(ref)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      ${data.calculatorComments ? `
        <div style="margin-top:8px;font-size:10px;">
          <strong>Quality Notes:</strong>
          <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:75%;padding:0 6px;font-family:'Courier New',monospace;color:#0a3d8f;">${escapeHtml(data.calculatorComments)}</span>
        </div>
      ` : ""}

      ${data.isDiscretionBuy ? `
        <div class="gac-grn-discretion">
          <strong>REJECTED LOT — ADMIN DISCRETION PURCHASE</strong>
          <div>This coffee was quality rejected and forwarded for admin discretion.</div>
          <div><strong>Quality Price Submitted:</strong> UGX ${escapeHtml(data.unitPrice.toLocaleString())}/kg</div>
          ${data.rejectionReason ? `<div><strong>Rejection Reason:</strong> ${escapeHtml(data.rejectionReason)}</div>` : ""}
        </div>
      ` : ""}

      <table class="gac-grn-pricing-table">
        <tr>
          <td style="width:34%;"><strong>Other:</strong> <span class="gac-grn-line-fill">&nbsp;</span></td>
          <td style="width:33%;"></td>
          <td style="width:33%;"><strong>Contract No:</strong> <span class="gac-grn-line-fill gac-grn-line-fill-value">${displayValue(data.contractNo)}</span></td>
        </tr>
        <tr>
          <td><strong>Non-Contract Price:</strong></td>
          <td><strong>Paid Price:</strong> <span class="gac-grn-line-fill gac-grn-line-fill-value">${escapeHtml(data.unitPrice.toLocaleString())}</span></td>
          <td><strong>UGX:</strong> <span class="gac-grn-line-fill gac-grn-line-fill-value">${escapeHtml(totalAmount.toLocaleString())}</span></td>
        </tr>
        <tr>
          <td><strong>Contract Price:</strong></td>
          <td><strong>Paid Price:</strong> <span class="gac-grn-line-fill">&nbsp;</span></td>
          <td><strong>UGX:</strong> <span class="gac-grn-line-fill">&nbsp;</span></td>
        </tr>
        <tr>
          <td><strong>Advance — Payment Voucher No:</strong></td>
          <td><strong>Cheque No:</strong> <span class="gac-grn-line-fill">&nbsp;</span></td>
          <td><strong>UGX:</strong> <span class="gac-grn-line-fill">&nbsp;</span></td>
        </tr>
        <tr>
          <td><strong>Deduction / Other:</strong> <span class="gac-grn-line-fill" style="min-width:140px;">&nbsp;</span></td>
          <td></td>
          <td><strong>UGX:</strong> <span class="gac-grn-line-fill">&nbsp;</span></td>
        </tr>
        <tr class="gac-grn-total-row">
          <td colspan="2"><strong style="font-size:12px;">TOTAL PAID AFTER DEDUCTIONS:</strong></td>
          <td><strong>UGX:</strong> <span class="gac-grn-line-fill gac-grn-line-fill-value gac-grn-total-amount">${escapeHtml(totalAmount.toLocaleString())}</span></td>
        </tr>
        <tr>
          <td><strong>Paid Bank:</strong> <span class="gac-grn-line-fill" style="min-width:160px;">&nbsp;</span></td>
          <td colspan="2"><strong>Cheque No:</strong> <span class="gac-grn-line-fill" style="min-width:160px;">&nbsp;</span></td>
        </tr>
      </table>

      <div class="gac-grn-amount-words"><strong>Amount in Words:</strong> ${escapeHtml(numberToWords(totalAmount))}</div>

      <p class="gac-grn-note">
        <strong>NB:</strong> To suppliers — please check that you agree to the above calculations and deductions before you sign to receive your
        Payment / GRN. There will be no refunds or re-calculations once you have signed. Paid Price equals Daily Price / Contract Price
        divided by the Quality Factor.
      </p>

      <div class="gac-grn-supplier-sign">
        <strong>Signed in full acceptance — Supplier:</strong>
        <span class="gac-grn-sign-line">&nbsp;</span>
      </div>

      <table class="gac-grn-sign-table">
        <tr>
          <td class="gac-grn-sign-cell">
            <strong>Signed QM/QC:</strong><br/>
            <span class="gac-grn-sign-value">${displayValue(data.qualityApprovedBy || data.assessedBy, "")}</span>
          </td>
          <td class="gac-grn-sign-cell">
            <strong>Signed PM/UM:</strong><br/>
            <span class="gac-grn-sign-value">${displayValue(data.managerName || data.printedBy, "")}</span>
          </td>
          <td class="gac-grn-sign-cell">
            <strong>Signed AM:</strong><br/>
            <span class="gac-grn-sign-value">&nbsp;</span>
          </td>
        </tr>
      </table>

      <table class="gac-grn-footer-table">
        <tr>
          <td class="gac-grn-footer-left">
            <strong style="color:#1a1a1a;">GREAT AGRO COFFEE LIMITED</strong><br/>
            Kasese Municipality, Tibamwenda Road, Kasese, Uganda<br/>
            Tel: +256 393 001 626 &nbsp;|&nbsp; Email: info@greatpearlcoffee.com &nbsp;|&nbsp; Web: www.greatagrocoffee.com
            ${data.verificationCode ? `<br/><span class="gac-grn-verify-code">Verify code: ${escapeHtml(data.verificationCode)}</span>` : ""}
            ${data.printedBy ? `<br/><span><strong>Printed by:</strong> ${escapeHtml(data.printedBy)}</span>` : ""}
          </td>
          ${data.verificationCode ? `
            <td class="gac-grn-footer-right">
              <img src="${qrCodeUrl}" alt="Verify" class="gac-grn-qr" />
              <div class="gac-grn-qr-label">Scan to verify authenticity</div>
              <div class="gac-grn-qr-label">${escapeHtml(verificationUrl)}</div>
            </td>
          ` : ""}
        </tr>
      </table>

      <div class="gac-grn-system-note">
        Electronic GRN — system-generated by Great Agro Coffee Traceability System. No physical signature required for system records.
      </div>
    </div>
  `;
}

export function getGRNPreviewHTML(data: GRNDocumentData): string {
  return `${getGRNDocumentStyles()}<div class="gac-grn-preview-shell">${getGRNDocumentMarkup(data)}</div>`;
}

export function getGRNPrintDocumentHTML(data: GRNDocumentData[], title: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
        ${getGRNDocumentStyles()}
      </head>
      <body>
        <div class="gac-grn-preview-shell">
          ${data.map((item) => getGRNDocumentMarkup(item)).join("")}
        </div>
        <script>
          window.onload = function () {
            setTimeout(function () { window.print(); }, 400);
          };
        <\/script>
      </body>
    </html>
  `;
}
