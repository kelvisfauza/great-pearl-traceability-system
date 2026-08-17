import { format } from 'date-fns';
import { getStandardPrintStyles } from '@/utils/printStyles';
import { getStandardPrintFooter } from '@/components/print/PrintFooter';

export interface DispatchAnalysisRecord {
  id: string;
  analysis_number?: string | null;
  dispatch_date: string;
  truck_serial_number: string;
  vehicle_registration?: string | null;
  driver_name?: string | null;
  destination_buyer?: string | null;
  dispatch_location?: string | null;
  coffee_type?: string | null;
  batch_references?: string | null;
  bags_loaded?: number | null;
  total_weight_kg?: number | null;
  sample_weight_g?: number | null;
  moisture_content?: number | null;
  group1_defects?: number | null;
  group2_defects?: number | null;
  below_screen_12?: number | null;
  screen_15_plus?: number | null;
  foreign_matter?: number | null;
  pods_husks?: number | null;
  cup_score?: number | null;
  cup_profile?: string | null;
  outturn?: number | null;
  verdict?: string | null;
  sampled_by?: string | null;
  analysed_by?: string | null;
  approved_by?: string | null;
  remarks?: string | null;
  created_by_name?: string | null;
  created_at?: string;
}

const v = (x: any, suffix = '') =>
  x === null || x === undefined || x === '' ? '-' : `${x}${suffix}`;

const copyHtml = (r: DispatchAnalysisRecord, copyLabel: string) => `
  <div class="copy">
    <div class="print-header">
      <div class="company-name">Great Agro Coffee</div>
      <div class="company-subtitle">A Member of YEDA Coffee Company Limited</div>
      <div class="company-details">P.O Box 431420, Kasese, Uganda<br/>+256 393 001 626 / +256 393 101 103</div>
      <div class="document-title">Dispatch Quality Analysis Report</div>
      <div class="document-info">
        No: ${v(r.analysis_number)} &nbsp;|&nbsp; Date: ${format(new Date(r.dispatch_date), 'dd MMM yyyy')}
        &nbsp;|&nbsp; <strong>${copyLabel}</strong>
      </div>
    </div>

    <div class="content-section">
      <div class="section-title">A. Dispatch / Truck Details</div>
      <table>
        <tr><td><strong>Serial No. on Truck</strong></td><td>${v(r.truck_serial_number)}</td><td><strong>Vehicle Reg.</strong></td><td>${v(r.vehicle_registration)}</td></tr>
        <tr><td><strong>Driver</strong></td><td>${v(r.driver_name)}</td><td><strong>Destination / Buyer</strong></td><td>${v(r.destination_buyer)}</td></tr>
        <tr><td><strong>Dispatch Location</strong></td><td>${v(r.dispatch_location)}</td><td><strong>Coffee Type</strong></td><td>${v(r.coffee_type)}</td></tr>
        <tr><td><strong>Bags Loaded</strong></td><td>${v(r.bags_loaded)}</td><td><strong>Total Weight</strong></td><td>${v(r.total_weight_kg, ' kg')}</td></tr>
        <tr><td><strong>Lot / Batch Refs</strong></td><td colspan="3">${v(r.batch_references)}</td></tr>
      </table>
    </div>

    <div class="content-section">
      <div class="section-title">B. Results of the Sample</div>
      <table>
        <thead><tr><th>Parameter</th><th>Result</th><th>Parameter</th><th>Result</th></tr></thead>
        <tbody>
          <tr><td>Sample Weight</td><td>${v(r.sample_weight_g, ' g')}</td><td>Moisture Content</td><td>${v(r.moisture_content, ' %')}</td></tr>
          <tr><td>Group 1 Defects</td><td>${v(r.group1_defects, ' %')}</td><td>Group 2 Defects</td><td>${v(r.group2_defects, ' %')}</td></tr>
          <tr><td>Below Screen 12</td><td>${v(r.below_screen_12, ' %')}</td><td>Screen 15+</td><td>${v(r.screen_15_plus, ' %')}</td></tr>
          <tr><td>Foreign Matter</td><td>${v(r.foreign_matter, ' %')}</td><td>Pods / Husks</td><td>${v(r.pods_husks, ' %')}</td></tr>
          <tr><td>Outturn</td><td>${v(r.outturn, ' %')}</td><td>Cup Score</td><td>${v(r.cup_score)}</td></tr>
          <tr><td>Cup Profile</td><td colspan="3">${v(r.cup_profile)}</td></tr>
          <tr class="total-row"><td><strong>Verdict</strong></td><td colspan="3"><strong>${(r.verdict || 'accepted').toUpperCase()}</strong></td></tr>
        </tbody>
      </table>
    </div>

    <div class="content-section">
      <div class="section-title">C. Remarks</div>
      <p>${r.remarks ? String(r.remarks).replace(/</g, '&lt;') : 'None'}</p>
    </div>

    <div class="signatures">
      <div>
        <div class="signature-line"></div>
        <p>Sampled By${r.sampled_by ? `: ${r.sampled_by}` : ''}</p>
      </div>
      <div>
        <div class="signature-line"></div>
        <p>Analysed By${r.analysed_by ? `: ${r.analysed_by}` : ''}</p>
      </div>
      <div>
        <div class="signature-line"></div>
        <p>Approved By${r.approved_by ? `: ${r.approved_by}` : ''}</p>
      </div>
      <div>
        <div class="signature-line"></div>
        <p>Driver / Received By</p>
      </div>
    </div>

    ${getStandardPrintFooter()}
  </div>
`;

export const printDispatchAnalysis = (r: DispatchAnalysisRecord) => {
  const html = `
    <html>
      <head>
        <title>Dispatch Analysis - ${r.analysis_number || r.truck_serial_number}</title>
        <style>
          ${getStandardPrintStyles()}
          .copy { page-break-after: always; }
          .copy:last-child { page-break-after: auto; }
          .signatures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 28px; }
          .signature-line { border-bottom: 1px solid #000; height: 34px; }
          .signatures p { font-size: 11px; margin-top: 4px; }
        </style>
      </head>
      <body>
        ${copyHtml(r, 'COPY 1 OF 2 — TRUCK COPY (travels with the truck)')}
        ${copyHtml(r, 'COPY 2 OF 2 — MANAGEMENT COPY (office file)')}
      </body>
    </html>
  `;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  }
};
