import jsPDF from 'jspdf';

export interface ApprovedContractData {
  employeeName: string;
  employeeEmail: string;
  employeeId?: string;
  position: string;
  department: string;
  salary: number;
  durationMonths: number;
  startDate: string;
  endDate: string;
  role?: string;
  approvedBy: string;
  approvalDate: string;
  renewalCount?: number;
  adminNotes?: string;
}

const BRAND: [number, number, number] = [0, 0, 0];
const ACCENT: [number, number, number] = [0, 0, 0];
const LIGHT: [number, number, number] = [245, 245, 245];
const GREY: [number, number, number] = [96, 96, 96];
const LINE: [number, number, number] = [150, 150, 150];
const DARK: [number, number, number] = [0, 0, 0];

export function generateApprovedContractBlob(d: ApprovedContractData): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 14;
  let y = 0;

  // Header
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
  doc.text('Under Hello YEDA Coffee Company Limited', M, 17);
  doc.setFontSize(8);
  doc.text('P.O Box 431420, Kasese, Uganda  |  +256 393 001 626  |  info@greatpearlcoffee.com', M, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('EMPLOYMENT CONTRACT', W - M, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('CONFIDENTIAL — HR DOCUMENT', W - M, 17, { align: 'right' });
  y = 36;

  // Title
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CONTRACT RENEWAL — APPROVED', W / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text(
    'This document confirms the renewal of employment under the terms set out below.',
    W / 2, y, { align: 'center' }
  );
  y += 8;

  // Approval badge
  doc.setFillColor(...LIGHT);
  doc.rect(M, y, W - 2 * M, 9, 'F');
  doc.setTextColor(...BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`APPROVED BY: ${d.approvedBy}`, M + 3, y + 6);
  doc.text(`DATE: ${d.approvalDate}`, W - M - 3, y + 6, { align: 'right' });
  y += 14;

  const sectionTitle = (title: string) => {
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

  const row = (l1: string, v1: string, l2: string, v2: string) => {
    const colW = (W - 2 * M - 6) / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(l1.toUpperCase(), M, y);
    doc.text(l2.toUpperCase(), M + colW + 6, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(v1 || '—', M, y + 5);
    doc.text(v2 || '—', M + colW + 6, y + 5);
    doc.setDrawColor(...LINE);
    doc.line(M, y + 6, M + colW, y + 6);
    doc.line(M + colW + 6, y + 6, M + 2 * colW + 6, y + 6);
    y += 11;
  };

  sectionTitle('EMPLOYEE DETAILS');
  row('Full Name', d.employeeName, 'Employee ID', d.employeeId || '—');
  row('Email', d.employeeEmail, 'System Role', d.role || 'User');

  sectionTitle('RENEWED CONTRACT TERMS');
  row('Position', d.position, 'Department', d.department);
  row('Start Date', d.startDate, 'End Date', d.endDate);
  row('Duration', `${d.durationMonths} months`, 'Gross Salary (UGX)', Number(d.salary || 0).toLocaleString());
  row('Renewal Number', String(d.renewalCount ?? 1), 'Status', 'Active');

  if (d.adminNotes) {
    sectionTitle('NOTES FROM ADMINISTRATION');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(d.adminNotes, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 5 + 4;
  }

  sectionTitle('TERMS & CONDITIONS');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const terms = [
    '1. This renewal is governed by the Employment Act of Uganda and the company HR Policy in force at the time of renewal.',
    '2. The employee shall continue to maintain confidentiality of all company information, supplier relationships, pricing data and financial records during and after employment.',
    '3. Any outstanding salary advances, loans or company property must be reconciled in accordance with the company recovery policy.',
    '4. The company reserves the right to review performance, conduct and operational fit at any time during this contract period.',
    '5. Termination shall be subject to the notice and procedure set out in the company HR Policy and applicable Ugandan law.',
  ];
  terms.forEach((t) => {
    const ls = doc.splitTextToSize(t, W - 2 * M);
    doc.text(ls, M, y);
    y += ls.length * 4.2 + 1.5;
  });
  y += 4;

  // Signatures
  sectionTitle('APPROVALS & SIGN-OFF');
  const halfW = (W - 2 * M - 8) / 2;
  const signBlock = (title: string, name: string, x: number, w: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND);
    doc.text(title, x, y);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Name: ${name || '—'}`, x, y + 6);
    doc.line(x, y + 12, x + w, y + 12);
    doc.setFontSize(8);
    doc.text('Signature', x, y + 16);
    doc.line(x, y + 24, x + w, y + 24);
    doc.text('Date', x, y + 28);
  };
  signBlock('EMPLOYEE ACCEPTANCE', d.employeeName, M, halfW);
  signBlock('ADMINISTRATION / HR', d.approvedBy, M + halfW + 8, halfW);
  y += 34;

  // Footer
  doc.setDrawColor(...LINE);
  doc.line(M, H - 14, W - M, H - 14);
  doc.setTextColor(...GREY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Great Agro Coffee — Under Hello YEDA Coffee Company Limited — Human Resources Department', M, H - 9);
  doc.text('CC: Operations Department', W - M, H - 9, { align: 'right' });

  return doc.output('blob');
}