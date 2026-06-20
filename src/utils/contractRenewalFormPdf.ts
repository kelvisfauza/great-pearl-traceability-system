import jsPDF from 'jspdf';

export interface ContractRenewalFormData {
  ref?: string;
  date?: string;
  employeeName?: string;
  employeeId?: string;
  nin?: string;
  phone?: string;
  email?: string;
  department?: string;
  position?: string;
  dateJoined?: string;
  currentContractType?: string;
  currentStartDate?: string;
  currentEndDate?: string;
  currentSalary?: string;
  tenure?: string;
  renewalCount?: number;
}

const BRAND: [number, number, number] = [0, 0, 0];
const ACCENT: [number, number, number] = [0, 0, 0];
const LIGHT: [number, number, number] = [245, 245, 245];
const GREY: [number, number, number] = [96, 96, 96];
const LINE: [number, number, number] = [150, 150, 150];
const DARK: [number, number, number] = [0, 0, 0];

const LONG_LINE = '________________________________________________';
const SHORT_LINE = '________________________';

const v = (s?: string) => (s && String(s).trim().length > 0 ? String(s) : SHORT_LINE);
const vLong = (s?: string) => (s && String(s).trim().length > 0 ? String(s) : LONG_LINE);

export function generateContractRenewalFormPdf(
  data: ContractRenewalFormData = {},
  filename = 'Contract_Renewal_Form.pdf'
) {
  const doc = buildContractRenewalDoc(data);
  doc.save(filename);
}

export function generateContractRenewalFormBlob(
  data: ContractRenewalFormData = {}
): Blob {
  const doc = buildContractRenewalDoc(data);
  return doc.output('blob');
}

function buildContractRenewalDoc(
  data: ContractRenewalFormData = {}
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const M = 14;
  let y = 0;

  const drawHeader = (pageLabel: string) => {
    doc.setFillColor(...BRAND);
    doc.rect(0, 0, W, 28, 'F');
    doc.setFillColor(...ACCENT);
    doc.rect(0, 28, W, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('GREAT AGRO COFFEE', M, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('A Member of YEDA Coffee Company Limited', M, 17);
    doc.setFontSize(8);
    doc.text('P.O Box 431420, Kasese, Uganda  |  +256 393 001 626  |  info@greatpearlcoffee.com', M, 23);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(pageLabel, W - M, 11, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('CONFIDENTIAL — HR DOCUMENT', W - M, 17, { align: 'right' });

    y = 36;
  };

  const drawFooter = (page: number, total: number) => {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(M, H - 14, W - M, H - 14);
    doc.setTextColor(...GREY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Great Agro Coffee — A Member of YEDA Coffee Company Limited — Human Resources Department', M, H - 9);
    doc.text(`Ref: ${data.ref || ''}`, W / 2, H - 9, { align: 'center' });
    doc.text(`Page ${page} of ${total}  |  CC: Operations Department`, W - M, H - 9, { align: 'right' });
  };

  const sectionTitle = (title: string) => {
    ensureSpace(12);
    doc.setFillColor(...LIGHT);
    doc.rect(M, y, W - 2 * M, 7, 'F');
    doc.setTextColor(...BRAND);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, M + 2, y + 5);
    y += 10;
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
  };

  const ensureSpace = (h: number) => {
    if (y + h > H - 20) {
      doc.addPage();
      drawHeader('CONTRACT RENEWAL FORM');
    }
  };

  const labeledLine = (label: string, value?: string, width = (W - 2 * M)) => {
    ensureSpace(7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text(label.toUpperCase(), M, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(v(value), M, y + 5);
    doc.setDrawColor(...LINE);
    doc.line(M, y + 6, M + width, y + 6);
    y += 10;
  };

  const twoCol = (l1: string, v1?: string, l2?: string, v2?: string) => {
    ensureSpace(10);
    const colW = (W - 2 * M - 6) / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(l1.toUpperCase(), M, y);
    if (l2) doc.text(l2.toUpperCase(), M + colW + 6, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(v(v1), M, y + 5);
    if (l2) doc.text(v(v2), M + colW + 6, y + 5);
    doc.setDrawColor(...LINE);
    doc.line(M, y + 6, M + colW, y + 6);
    if (l2) doc.line(M + colW + 6, y + 6, M + 2 * colW + 6, y + 6);
    y += 10;
  };

  const paragraph = (text: string, opts: { italic?: boolean; size?: number; gap?: number } = {}) => {
    const size = opts.size ?? 9;
    doc.setFont('helvetica', opts.italic ? 'italic' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(text, W - 2 * M);
    ensureSpace(lines.length * (size * 0.42) + (opts.gap ?? 2));
    doc.text(lines, M, y);
    y += lines.length * (size * 0.42) + (opts.gap ?? 2);
  };

  const blankLines = (count: number, label?: string) => {
    if (label) {
      ensureSpace(6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(label.toUpperCase(), M, y);
      y += 4;
    }
    for (let i = 0; i < count; i++) {
      ensureSpace(8);
      doc.setDrawColor(...LINE);
      doc.line(M, y + 4, W - M, y + 4);
      y += 7;
    }
    y += 2;
  };

  const checkbox = (label: string) => {
    ensureSpace(6);
    doc.setDrawColor(...DARK);
    doc.rect(M, y - 3, 3.5, 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(label, M + 6, y);
    y += 6;
  };

  // ============ PAGE 1 ============
  drawHeader('CONTRACT RENEWAL FORM');

  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('EMPLOYEE CONTRACT RENEWAL APPLICATION', W / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...GREY);
  doc.text('This form must be completed in full and submitted to HR with copy to Operations Department.', W / 2, y, { align: 'center' });
  y += 6;

  // Ref + Date band
  doc.setFillColor(...LIGHT);
  doc.rect(M, y, W - 2 * M, 9, 'F');
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`REF NO: ${data.ref || '__________________'}`, M + 3, y + 6);
  doc.text(`DATE: ${data.date || new Date().toLocaleDateString('en-GB')}`, W - M - 3, y + 6, { align: 'right' });
  y += 13;

  // SECTION A
  sectionTitle('SECTION A — EMPLOYEE PERSONAL DETAILS');
  twoCol('Full Name', data.employeeName, 'Employee ID (GAC)', data.employeeId);
  twoCol('National ID (NIN)', data.nin, 'Mobile Phone', data.phone);
  twoCol('Email Address', data.email, 'Date of Birth', undefined);
  twoCol('Marital Status', undefined, 'Next of Kin', undefined);
  labeledLine('Residential Address (Village, Parish, Sub-County, District)');

  // SECTION B
  sectionTitle('SECTION B — CURRENT EMPLOYMENT DETAILS');
  twoCol('Department', data.department, 'Position / Job Title', data.position);
  twoCol('Date Joined Company', data.dateJoined, 'Total Tenure', data.tenure);
  twoCol('Current Contract Type', data.currentContractType, 'Previous Renewals', String(data.renewalCount ?? 0));
  twoCol('Current Contract Start', data.currentStartDate, 'Current Contract End', data.currentEndDate);
  twoCol('Current Gross Salary (UGX)', data.currentSalary, 'Reporting Supervisor', undefined);

  // SECTION C
  sectionTitle('SECTION C — CONTRACT STATUS DECLARATION');
  paragraph(
    'I hereby acknowledge that my current employment contract with Great Agro Coffee (a member of YEDA Coffee Company Limited) has either expired or is due to expire shortly. I am formally applying for renewal of my contract under the terms outlined in Section E below, subject to performance review, departmental approval and management discretion.',
    { gap: 3 }
  );
  checkbox('My contract has already EXPIRED');
  checkbox('My contract is EXPIRING within 30 days');
  checkbox('I am applying for RENEWAL of my contract');
  checkbox('I am requesting a CHANGE of contract type (e.g. Fixed-Term → Permanent)');

  drawFooter(1, 3);

  // ============ PAGE 2 ============
  doc.addPage();
  drawHeader('CONTRACT RENEWAL FORM');

  // SECTION D
  sectionTitle('SECTION D — PERFORMANCE SELF-ASSESSMENT (Employee)');
  paragraph('Please describe your key achievements, contributions and the value you have added to the company during the current contract period:', { italic: true, gap: 1 });
  blankLines(5);
  paragraph('List any additional responsibilities, projects or initiatives you have led or supported:', { italic: true, gap: 1 });
  blankLines(4);
  paragraph('Describe challenges you faced and how you addressed them:', { italic: true, gap: 1 });
  blankLines(4);
  paragraph('What training, skills development or career growth would you like during the renewed contract period?', { italic: true, gap: 1 });
  blankLines(3);

  // SECTION E
  sectionTitle('SECTION E — REQUESTED RENEWAL TERMS');
  twoCol('Proposed Contract Type', undefined, 'Proposed Duration (Months)', undefined);
  twoCol('Proposed Start Date', undefined, 'Proposed End Date', undefined);
  twoCol('Proposed Gross Salary (UGX)', undefined, 'Salary Increment Justification', undefined);
  labeledLine('Additional Benefits Requested (Allowances, Airtime, Transport, etc.)');
  paragraph('Justification for renewal and any salary adjustment requested:', { italic: true, gap: 1 });
  blankLines(4);

  drawFooter(2, 3);

  // ============ PAGE 3 ============
  doc.addPage();
  drawHeader('CONTRACT RENEWAL FORM');

  // SECTION F
  sectionTitle('SECTION F — SUPERVISOR / DEPARTMENT HEAD ASSESSMENT');
  paragraph('Performance rating (1 = Poor, 5 = Excellent): Punctuality ____ | Quality of Work ____ | Teamwork ____ | Integrity ____ | Initiative ____', { gap: 2 });
  paragraph('Supervisor comments on employee\'s performance, conduct and suitability for renewal:', { italic: true, gap: 1 });
  blankLines(5);
  paragraph('Recommendation:', { italic: true, gap: 1 });
  checkbox('Recommend RENEWAL on the same terms');
  checkbox('Recommend RENEWAL with revised terms (specify in comments)');
  checkbox('Recommend NON-RENEWAL (specify reason in comments)');
  checkbox('Recommend conversion to PERMANENT status');
  y += 2;
  twoCol('Supervisor Name', undefined, 'Designation', undefined);
  twoCol('Signature', undefined, 'Date', undefined);

  // SECTION G
  sectionTitle('SECTION G — TERMS, CONDITIONS & DECLARATIONS');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  const terms = [
    '1. Renewal of this contract is at the sole discretion of Great Agro Coffee (a member of YEDA Coffee Company Limited) and is subject to satisfactory performance, conduct and the operational needs of the company.',
    '2. The renewed contract will be governed by the Employment Act of Uganda, the company\'s HR Policy Manual and the Code of Conduct in force at the time of renewal.',
    '3. The employee is required to give written notice as per the renewed contract terms in case of resignation, and the company reserves the same right of termination subject to law.',
    '4. The employee shall continue to maintain confidentiality of all company information, trade secrets, supplier relationships, pricing data and financial records during and after employment.',
    '5. Any outstanding salary advances, loans, equipment or company property must be reconciled before renewal is finalized.',
    '6. All renewal applications must be copied to the Operations Department for record and operational planning purposes.',
    '7. This form, once signed by all parties, forms part of the employee\'s permanent HR file and supersedes any prior verbal commitments.',
  ];
  terms.forEach(t => paragraph(t, { size: 8.5, gap: 1.5 }));

  // SECTION H — Sign-offs
  sectionTitle('SECTION H — APPROVALS & SIGN-OFF');
  ensureSpace(60);

  const signBlock = (title: string, x: number, w: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND);
    doc.text(title, x, y);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Name:', x, y + 6);
    doc.line(x + 12, y + 6, x + w, y + 6);
    doc.text('Signature:', x, y + 14);
    doc.line(x + 18, y + 14, x + w, y + 14);
    doc.text('Date:', x, y + 22);
    doc.line(x + 10, y + 22, x + w, y + 22);
    doc.text('Stamp:', x, y + 30);
    doc.rect(x + 12, y + 26, 24, 12);
  };

  const halfW = (W - 2 * M - 8) / 2;
  signBlock('EMPLOYEE ACCEPTANCE', M, halfW);
  signBlock('HUMAN RESOURCES MANAGER', M + halfW + 8, halfW);
  y += 44;
  ensureSpace(46);
  signBlock('OPERATIONS DEPARTMENT (CC)', M, halfW);
  signBlock('MANAGING DIRECTOR / ADMIN', M + halfW + 8, halfW);
  y += 44;

  // CC line
  ensureSpace(12);
  doc.setDrawColor(...LINE);
  doc.line(M, y, W - M, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND);
  doc.text('CC:', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  doc.text('Operations Department  |  Human Resources  |  Finance  |  Employee File', M + 8, y);

  drawFooter(3, 3);

  return doc;
}