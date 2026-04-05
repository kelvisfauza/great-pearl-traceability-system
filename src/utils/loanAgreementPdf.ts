import jsPDF from 'jspdf';

interface LoanPdfData {
  // Loan details
  loanId: string;
  loanType: string;
  principal: number;
  interestRate: number;
  dailyRate: number;
  durationMonths: number;
  totalRepayable: number;
  remainingBalance: number;
  installmentAmount: number;
  installmentFrequency: string;
  numInstallments: number;
  startDate: string;
  endDate: string;
  firstDeductionDate: string;
  approvedBy: string;
  approvalDate: string;
  disbursedAmount: number;
  isTopUp: boolean;
  // Borrower
  employeeName: string;
  employeeEmail: string;
  employeeId?: string;
  employeePhone?: string;
  employeePosition?: string;
  employeeDepartment?: string;
  employeeSalary?: number;
  // Guarantor
  guarantorName: string;
  guarantorEmail?: string;
  guarantorPhone?: string;
}

const fmt = (n: number) => `UGX ${n.toLocaleString()}`;

export function generateLoanAgreementPdf(data: LoanPdfData): Blob {
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = w - margin * 2;
  let y = 15;

  const green = [26, 86, 50] as const;
  const darkGray = [51, 51, 51] as const;
  const midGray = [119, 119, 119] as const;
  const lightBg = [245, 247, 245] as const;

  // Header bar
  doc.setFillColor(...green);
  doc.rect(0, 0, w, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Great Pearl Coffee', margin, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Loan Agreement Document', margin, 22);
  doc.text(`Ref: LOAN-${data.loanId.substring(0, 8).toUpperCase()}`, w - margin, 14, { align: 'right' });
  doc.text(`Date: ${data.approvalDate}`, w - margin, 22, { align: 'right' });
  y = 40;

  // --- Section helper ---
  const drawSection = (title: string, rows: [string, string][], bgColor?: readonly [number, number, number]) => {
    if (y > 255) { doc.addPage(); y = 20; }
    // Section title
    doc.setFillColor(...green);
    doc.roundedRect(margin, y, contentW, 8, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 4, y + 5.5);
    y += 12;

    // Rows
    const colW = contentW / 2;
    rows.forEach(([label, value], i) => {
      if (y > 275) { doc.addPage(); y = 20; }
      if (bgColor && i % 2 === 0) {
        doc.setFillColor(...bgColor);
        doc.rect(margin, y - 4, contentW, 7, 'F');
      }
      doc.setTextColor(...midGray);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(label, margin + 4, y);
      doc.setTextColor(...darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(value, margin + colW, y);
      y += 7;
    });
    y += 4;
  };

  // Loan Summary
  drawSection('LOAN SUMMARY', [
    ['Loan Type', data.loanType],
    ['Principal Amount', fmt(data.principal)],
    ['Interest Rate', `${data.interestRate}% /month (${data.dailyRate}% /day)`],
    ['Duration', `${data.durationMonths} month(s)`],
    ['Total Repayable', fmt(data.totalRepayable)],
    ...(data.isTopUp ? [['Additional Disbursed', fmt(data.disbursedAmount)] as [string, string]] : []),
    ['Remaining Balance', fmt(data.remainingBalance)],
  ], lightBg);

  // Repayment Schedule
  drawSection('REPAYMENT SCHEDULE', [
    ['Installment Amount', `${fmt(data.installmentAmount)} / ${data.installmentFrequency}`],
    ['Number of Payments', `${data.numInstallments} ${data.installmentFrequency}(s)`],
    ['First Deduction', data.firstDeductionDate],
    ['Start Date', data.startDate],
    ['End Date', data.endDate],
    ['Recovery Method', 'Automatic wallet deduction'],
  ], [255, 248, 225]);

  // Borrower Profile
  drawSection('BORROWER PROFILE', [
    ['Full Name', data.employeeName],
    ['Email', data.employeeEmail],
    ...(data.employeeId ? [['Employee ID', data.employeeId] as [string, string]] : []),
    ...(data.employeePhone ? [['Phone', data.employeePhone] as [string, string]] : []),
    ...(data.employeePosition ? [['Position', data.employeePosition] as [string, string]] : []),
    ...(data.employeeDepartment ? [['Department', data.employeeDepartment] as [string, string]] : []),
    ...(data.employeeSalary ? [['Monthly Salary', fmt(data.employeeSalary)] as [string, string]] : []),
  ], [227, 242, 253]);

  // Guarantor Profile
  drawSection('GUARANTOR PROFILE', [
    ['Full Name', data.guarantorName || 'N/A'],
    ...(data.guarantorEmail ? [['Email', data.guarantorEmail] as [string, string]] : []),
    ...(data.guarantorPhone ? [['Phone', data.guarantorPhone] as [string, string]] : []),
  ], [227, 242, 253]);

  // Approval
  drawSection('APPROVAL', [
    ['Approved By', data.approvedBy],
    ['Approval Date', data.approvalDate],
    ['Status', 'Active — Disbursed'],
  ], lightBg);

  // Terms & Conditions
  if (y > 230) { doc.addPage(); y = 20; }
  doc.setFillColor(...green);
  doc.roundedRect(margin, y, contentW, 8, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMS & CONDITIONS', margin + 4, y + 5.5);
  y += 14;

  const terms = [
    'Repayments are automatically deducted from your wallet on schedule.',
    'Failure to maintain sufficient wallet balance may result in recovery from your guarantor\'s wallet.',
    'Early repayment is allowed and attracts a pro-rata interest discount.',
    'Default on 3+ consecutive installments may trigger guarantor liability and salary deduction.',
    'This loan agreement is binding upon approval.',
  ];

  doc.setTextColor(...darkGray);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  terms.forEach((t, i) => {
    if (y > 280) { doc.addPage(); y = 20; }
    doc.text(`${i + 1}. ${t}`, margin + 4, y, { maxWidth: contentW - 8 });
    y += 6;
  });

  // Footer
  y += 6;
  doc.setDrawColor(...green);
  doc.line(margin, y, w - margin, y);
  y += 6;
  doc.setTextColor(...midGray);
  doc.setFontSize(7);
  doc.text(`© ${new Date().getFullYear()} Great Pearl Coffee • Official Loan Agreement Document • Generated at approval`, w / 2, y, { align: 'center' });
  doc.text('Please keep this document for your records.', w / 2, y + 4, { align: 'center' });

  return doc.output('blob');
}
