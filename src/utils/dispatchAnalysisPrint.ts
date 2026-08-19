import { format } from 'date-fns';
import { getStandardPrintStyles } from '@/utils/printStyles';
import { getStandardPrintFooter } from '@/components/print/PrintFooter';
import { addToPrintQueue } from '@/lib/printQueue';
import { toast } from 'sonner';

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

const row = (label: string, value: string) =>
  `<tr><td class="lbl">${label}</td><td class="val">${value}</td></tr>`;

const copyHtml = (r: DispatchAnalysisRecord, copyLabel: string) => `
  <div class="copy">
    <div class="form-head">
      <div>
        <div class="company-name">GREAT AGRO COFFEE</div>
        <div class="company-subtitle">a member of YEDA COFFEE COMPANY LIMITED</div>
        <div class="company-details">P.O Box 431420, Kasese, Uganda | +256 393 001 626 / +256 393 101 103 | info@greatpearlcoffee.com</div>
      </div>
      <div class="head-right">DISPATCH ANALYSIS FORM</div>
    </div>
    <div class="head-rule"></div>

    <div class="form-title">DISPATCH QUALITY ANALYSIS FORM</div>
    <div class="copy-label">${copyLabel}</div>

    <table class="form-table">
      ${row('Form No.', `<strong>${v(r.analysis_number)}</strong>`)}
      ${row('Date', format(new Date(r.dispatch_date), 'dd MMM yyyy'))}
      ${row('Serial No. on Truck', v(r.truck_serial_number))}
      ${row('Vehicle Registration', v(r.vehicle_registration))}
      ${row('Driver', v(r.driver_name))}
      ${row('Destination / Buyer', v(r.destination_buyer))}
      ${row('Dispatch Location', v(r.dispatch_location))}
      ${row('Coffee Type', v(r.coffee_type))}
      ${row('Lot / Batch References', v(r.batch_references))}
      ${row('Bags Loaded', v(r.bags_loaded))}
      ${row('Total Weight (Kg)', v(r.total_weight_kg))}
      ${row('Grams Used (Sample Weight)', v(r.sample_weight_g))}
      ${row('Moisture Content (M.C %)', v(r.moisture_content))}
      ${row('Below Screen 12 (%)', v(r.below_screen_12))}
      ${row('Screen 15+ (%)', v(r.screen_15_plus))}
      ${row('Group 1 Defects (%)', v(r.group1_defects))}
      ${row('Group 2 Defects (%)', v(r.group2_defects))}
      ${row('Pods / Husks (%)', v(r.pods_husks))}
      ${row('Foreign Matter (%)', v(r.foreign_matter))}
      ${row('Outturn (%)', v(r.outturn))}
      ${row('Cup Score', v(r.cup_score))}
      ${row('Cup Profile', v(r.cup_profile))}
      ${row('Verdict', `<strong>${(r.verdict || 'accepted').toUpperCase()}</strong>`)}
      ${row('Sampled By', v(r.sampled_by))}
      ${row('Analysed By', v(r.analysed_by))}
      ${row('Approved By', v(r.approved_by))}
      ${row('Comments', r.remarks ? String(r.remarks).replace(/</g, '&lt;') : '-')}
    </table>

    <div class="sign-boxes">
      <div class="sign-box">
        <div class="sign-title">QUALITY PERSONNEL — Sign &amp; Stamp</div>
        <div class="sign-meta">Name: ..............................................</div>
        <div class="sign-meta">Date: ........................</div>
      </div>
      <div class="sign-box">
        <div class="sign-title">DRIVER / RECEIVED BY — Sign</div>
        <div class="sign-meta">Name: ..............................................</div>
        <div class="sign-meta">Date: ........................</div>
      </div>
    </div>

    ${getStandardPrintFooter()}
  </div>
`;

export const printDispatchAnalysis = (r: DispatchAnalysisRecord, opts?: { direct?: boolean }) => {
  const html = `
    <html>
      <head>
        <title>Dispatch Analysis - ${r.analysis_number || r.truck_serial_number}</title>
        <style>
          ${getStandardPrintStyles()}
          .copy { page-break-after: always; }
          .copy:last-child { page-break-after: auto; }
          .form-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
          .company-name { font-size: 16px; font-weight: bold; }
          .company-subtitle { font-size: 9px; }
          .company-details { font-size: 8px; }
          .head-right { font-size: 10px; font-weight: bold; text-align: right; }
          .head-rule { border-top: 1.5px solid #000; margin: 6px 0 10px; }
          .form-title { text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 2px; }
          .copy-label { text-align: center; font-size: 9px; margin-bottom: 8px; }
          .form-table { width: 100%; border-collapse: collapse; }
          .form-table td { border: 0.6px solid #000; padding: 5px 6px; font-size: 10px; height: 18px; }
          .form-table tr:nth-child(odd) td { background: #f0f0f0; }
          .form-table .lbl { width: 42%; font-weight: bold; }
          .sign-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
          .sign-box { border: 0.6px solid #000; padding: 6px; height: 68px; }
          .sign-title { font-size: 8.5px; font-weight: bold; margin-bottom: 26px; }
          .sign-meta { font-size: 7.5px; color: #5a5a5a; }
        </style>
      </head>
      <body>
        ${copyHtml(r, 'COPY 1 OF 2 — TRUCK COPY (travels with the truck)')}
        ${copyHtml(r, 'COPY 2 OF 2 — MANAGEMENT COPY (office file)')}
      </body>
    </html>
  `;

  if (opts?.direct) {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 500);
    }
    return;
  }

  void addToPrintQueue({
    title: `Dispatch Analysis - ${r.analysis_number || r.truck_serial_number}`,
    docType: 'Dispatch Analysis',
    html,
  }).then((job) => {
    if (job) toast.success('Added to your print queue', { description: 'Open the Print Queue on the dashboard to print it.' });
    else toast.error('Could not add to print queue');
  });
};
