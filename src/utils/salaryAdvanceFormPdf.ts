import jsPDF from 'jspdf';

export interface SalaryAdvanceFormData {
  ref?: string;
  date?: string;
  name?: string;
  empId?: string;
  department?: string;
  position?: string;
  joined?: string;
  phone?: string;
  email?: string;
  nin?: string;
  salary?: string;
  amount?: string;
  amountWords?: string;
  minPayment?: string;
  period?: string;
  reason?: string;
  method?: string;
  hrName?: string;
  adminName?: string;
  financeName?: string;
}

const BRAND: [number, number, number] = [123, 63, 0];
const ACCENT: [number, number, number] = [201, 162, 39];
const LIGHT: [number, number, number] = [245, 239, 230];
const GREY: [number, number, number] = [120, 120, 120];
const LINE: [number, number, number] = [160, 160, 160];

const UNDERSCORE = '____________________________________________';

const v = (s?: string) => (s && s.trim().length > 0 ? s : UNDERSCORE);

export function generateSalaryAdvanceFormPdf(
  data: SalaryAdvanceFormData = {},
  filename = 'Salary_Advance_Form.pdf'
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const M = 15;

  // Header band
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 22, 'F');
  doc.setFillColor(...ACCENT);
  doc.rect(0, 22, W, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('GREAT PEARL COFFEE FACTORY', M, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Kanoni-Mityana, Uganda  |  +256 781 121 639  |  greatpearlcoffee@gmail.com', M, 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SALARY ADVANCE', W - M, 11, { align: 'right' });
  doc.text('REQUEST FORM', W - M, 16, { align: 'right' });

  // Title
  let y = 32;
  doc.setTextColor(...BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Employee Salary Advance Request', W / 2, y, { align: 'center' });
  y += 5;
  doc.setTextColor(...GREY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'Submit completed form to HR. Subject to Admin and Finance approval.',
    W / 2,
    y,
    { align: 'center' }
  );
  y += 6;

  // Reference / date box
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...ACCENT);
  doc.rect(M, y, W - 2 * M, 9, 'FD');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Reference No:', M + 3, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(v(data.ref), M + 30, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', W / 2 + 5, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(v(data.date), W / 2 + 17, y + 6);
  y += 13;

  const section = (label: string) => {
    doc.setFillColor(...BRAND);
    doc.rect(M, y, W - 2 * M, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(label, M + 3, y + 5);
    y += 10;
  };

  const field = (label: string, value: string | undefined, x: number, width: number) => {
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, x, y);
    doc.setFont('helvetica', 'normal');
    const lineY = y + 5;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(x, lineY, x + width, lineY);
    const text = value && value.trim().length > 0 ? value : '';
    if (text) {
      const truncated = doc.splitTextToSize(text, width)[0];
      doc.text(truncated, x, lineY - 1);
    }
  };

  const rowTwo = (l1: string, v1: string | undefined, l2: string, v2: string | undefined) => {
    const colW = (W - 2 * M - 8) / 2;
    field(l1, v1, M, colW);
    field(l2, v2, M + colW + 8, colW);
    y += 11;
  };

  const rowOne = (l: string, val: string | undefined) => {
    field(l, val, M, W - 2 * M);
    y += 11;
  };

  // 1. Employee Info
  section('1.  EMPLOYEE INFORMATION');
  rowOne('Full Name', data.name);
  rowTwo('Employee ID', data.empId, 'Department', data.department);
  rowTwo('Position', data.position, 'Date Joined', data.joined);
  rowTwo('Phone Number', data.phone, 'Email', data.email);
  rowTwo('National ID', data.nin, 'Monthly Salary (UGX)', data.salary);

  // 2. Advance details
  section('2.  ADVANCE DETAILS');
  rowTwo('Advance Amount (UGX)', data.amount, 'Amount in Words', data.amountWords);
  rowTwo('Minimum Monthly Payment', data.minPayment, 'Repayment Period (months)', data.period);
  rowOne('Reason for Advance', data.reason);
  rowOne('Preferred Disbursement Method', data.method);

  // 3. Declaration
  section('3.  EMPLOYEE DECLARATION');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const decl =
    'I confirm the information above is true and accurate. I authorise Great Pearl Coffee Factory to deduct the minimum monthly payment (or more) from my salary until the advance is fully repaid. I understand that failure to repay may result in disciplinary action and recovery from any final dues owed to me.';
  const declLines = doc.splitTextToSize(decl, W - 2 * M);
  doc.text(declLines, M, y);
  y += declLines.length * 4.2 + 8;

  // Signature lines
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(M, y, M + 70, y);
  doc.line(W - M - 60, y, W - M, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Employee Signature', M, y + 4);
  doc.text('Date', W - M - 60, y + 4);
  y += 10;

  // 4. Approvals
  section('4.  APPROVALS (OFFICIAL USE ONLY)');
  const cols = [38, 50, 42, 28, 22];
  const cx: number[] = [M];
  for (let i = 0; i < cols.length - 1; i++) cx.push(cx[i] + cols[i]);

  // header row
  doc.setFillColor(...LIGHT);
  doc.rect(M, y, W - 2 * M, 7, 'F');
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const headers = ['', 'Name', 'Signature', 'Date', 'Status'];
  headers.forEach((h, i) => doc.text(h, cx[i] + 2, y + 5));
  // grid
  const rowH = 11;
  const totalRows = 4; // header + 3 data
  for (let r = 0; r < totalRows; r++) {
    doc.rect(M, y + r * rowH, W - 2 * M, rowH);
    for (let c = 1; c < cols.length; c++) {
      doc.line(cx[c], y + r * rowH, cx[c], y + r * rowH + rowH);
    }
  }
  const labels = ['HR Officer', 'Admin Approval', 'Finance (Final)'];
  const names = [data.hrName, data.adminName, data.financeName];
  for (let r = 0; r < 3; r++) {
    const yy = y + (r + 1) * rowH;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(labels[r], cx[0] + 2, yy + 7);
    doc.setFont('helvetica', 'normal');
    if (names[r]) doc.text(names[r] as string, cx[1] + 2, yy + 7);
  }
  y += totalRows * rowH + 6;

  doc.setTextColor(...GREY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  const note =
    'Note: Approval flows Admin -> Finance. Advance is disbursed only after Finance final approval. Minimum monthly deduction is enforced via payroll on the 27th of each month.';
  doc.text(doc.splitTextToSize(note, W - 2 * M), M, y);

  // Footer
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.5);
  doc.line(M, H - 18, W - M, H - 18);
  doc.setTextColor(...GREY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Form HR-SA/2026 v1.0  |  Confidential - Internal Use Only', M, H - 12);
  doc.text('Page 1', W - M, H - 12, { align: 'right' });

  doc.save(filename);
}