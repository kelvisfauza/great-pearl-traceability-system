import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, ShoppingCart, Coffee, Wallet, Info, Truck, Fuel, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { jsPDF } from 'jspdf';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  Footer,
  ShadingType,
} from 'docx';
import {
  createLetterheadHeader,
  createLetterheadRegLine,
  createLetterheadFooter,
  fetchLogoBytes,
  letterheadSpacer,
} from '@/utils/docxLetterhead';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';


const LOGO_URL = '/lovable-uploads/great-agro-coffee-logo.png';
const COMPANY_NAME = 'GREAT AGRO COFFEE';
const COMPANY_TAGLINE = 'a member of YEDA COFFEE COMPANY LIMITED';
const COMPANY_ADDRESS = 'P.O Box 431420, Kasese, Uganda';

const generateRefNumber = (prefix: string) => {
  const date = new Date();
  const yr = date.getFullYear().toString().slice(-2);
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const dy = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${yr}${mo}${dy}-${rand}`;
};

type TemplateType = 'cash-requisition' | 'personal-expense' | 'salary-request' | 'service-provider-requisition' | 'fuel-ledger' | 'department-report';

interface TemplateConfig {
  type: TemplateType;
  title: string;
  prefix: string;
  icon: React.ReactNode;
  description: string;
  fields: { label: string; lines?: number }[];
  approvalType: string;
}

const templates: TemplateConfig[] = [
  {
    type: 'cash-requisition',
    title: 'Cash Requisition Form',
    prefix: 'CR',
    icon: <ShoppingCart className="h-5 w-5" />,
    description: 'Request money for company purchases or business needs',
    approvalType: 'Cash Requisition',
    fields: [
      { label: 'Purpose / Title' },
      { label: 'Amount Requested (UGX)' },
      { label: 'Description / Justification', lines: 4 },
      { label: 'Items to be Purchased', lines: 3 },
      { label: 'Expected Delivery Date' },
    ],
  },
  {
    type: 'personal-expense',
    title: 'Personal Expense Claim Form',
    prefix: 'PE',
    icon: <Coffee className="h-5 w-5" />,
    description: 'Claim reimbursement for personal expenses (lunch, airtime, transport)',
    approvalType: 'Personal Expense',
    fields: [
      { label: 'Expense Type (Food/Airtime/Data/Transport/Other)' },
      { label: 'Amount Claimed (UGX)' },
      { label: 'Date of Expense' },
      { label: 'Description / Reason', lines: 3 },
      { label: 'Receipt Attached? (Yes / No)' },
    ],
  },
  {
    type: 'salary-request',
    title: 'Salary Request Form',
    prefix: 'SR',
    icon: <Wallet className="h-5 w-5" />,
    description: 'Request salary advance or payment',
    approvalType: 'Salary Request',
    fields: [
      { label: 'Request Type (Advance / Mid-Month / End-Month)' },
      { label: 'Amount Requested (UGX)' },
      { label: 'Reason for Request', lines: 4 },
      { label: 'Preferred Payment Method (Cash / Mobile Money / Bank)' },
      { label: 'Mobile Money / Bank Account Number' },
    ],
  },
  {
    type: 'service-provider-requisition',
    title: 'Service Provider Requisition',
    prefix: 'SPR',
    icon: <Truck className="h-5 w-5" />,
    description: 'Request payment for external service providers (transport, repairs, consultants, etc.)',
    approvalType: 'Service Provider Requisition',
    fields: [
      { label: 'Service Provider Name' },
      { label: 'Service Provider Contact / Phone' },
      { label: 'Service Provided', lines: 3 },
      { label: 'Amount to be Paid (UGX)' },
      { label: 'Payment Method (Cash / Mobile Money / Bank Transfer)' },
      { label: 'Mobile Money / Bank Account Number' },
      { label: 'Date of Service' },
      { label: 'Invoice / Receipt Number' },
      { label: 'Additional Notes / Justification', lines: 2 },
    ],
  },
  {
    type: 'fuel-ledger',
    title: 'Fuel / Service Provider Ledger',
    prefix: 'FL',
    icon: <Fuel className="h-5 w-5" />,
    description: 'Blank 10-row ledger for fuel stations (Total, Shell, etc.) to record truck refuels',
    approvalType: 'Fuel Ledger',
    fields: [
      { label: 'Service Provider (e.g. Total Energies)' },
      { label: 'Station Branch / Location' },
      { label: 'Period Covered' },
    ],
  },
  {
    type: 'department-report',
    title: 'Departmental Report Template (Word)',
    prefix: 'RPT',
    icon: <FileText className="h-5 w-5" />,
    description: 'Editable Word (.docx) report cover with company letterhead, reference, Report By, Department, Subject and Period — write your report inside Word',
    approvalType: 'Department Report',
    fields: [
      { label: 'Report Subject / Title' },
      { label: 'Report By (Full Name)' },
      { label: 'Position / Role' },
      { label: 'Department' },
      { label: 'Reporting Period (e.g. May 2026 / Week 22)' },
      { label: 'Date of Report' },
    ],
  },
];

const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load logo'));
    img.src = url;
  });
};


const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const generateDepartmentReportDocx = async (
  template: TemplateConfig,
  employeeName: string,
  department: string,
  position: string,
  prefill: PrefillData = {},
  employeeEmail?: string,
) => {
  const refNo = generateRefNumber(template.prefix);
  try {
    await supabase.from('expense_template_refs' as any).insert({
      ref: refNo,
      template_type: template.type,
      approval_type: template.approvalType,
      employee_email: employeeEmail || null,
      employee_name: employeeName,
    });
  } catch (e) {
    console.warn('Could not log expense template ref:', e);
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const subject = prefill.reason || prefill.beneficiaryName || '';
  const period = prefill.beneficiaryPhone || '';

  const logoBytes = await fetchLogoBytes();

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const allNoBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder };

  const thin = { style: BorderStyle.SINGLE, size: 4, color: '888888' };
  const cellBorders = { top: thin, bottom: thin, left: thin, right: thin };

  // ===== Standard letterhead (logo left, company name + tagline) =====
  const headerTable = createLetterheadHeader(logoBytes);
  const regLine = createLetterheadRegLine(false);

  // ===== Meta block (Our Ref / Your Ref / Date) =====
  const metaRow = (label: string, value: string) =>
    new DocxTableRow({
      children: [
        new DocxTableCell({
          width: { size: 1800, type: WidthType.DXA },
          borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
          margins: { top: 40, bottom: 40, left: 0, right: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22, font: 'Calibri' })] })],
        }),
        new DocxTableCell({
          width: { size: 7560, type: WidthType.DXA },
          borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
          margins: { top: 40, bottom: 40, left: 0, right: 0 },
          children: [new Paragraph({ children: [new TextRun({ text: value || '________________________________', size: 22, font: 'Calibri' })] })],
        }),
      ],
    });

  const metaTable = new DocxTable({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1800, 7560],
    borders: allNoBorders,
    rows: [
      metaRow('Our Ref:', refNo),
      metaRow('Your Ref:', ''),
      metaRow('Date:', dateStr),
    ],
  });

  // ===== Report details block =====
  const detailRow = (l1: string, v1: string, l2: string, v2: string) =>
    new DocxTableRow({
      children: [
        new DocxTableCell({
          width: { size: 1700, type: WidthType.DXA },
          borders: cellBorders,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          shading: { fill: 'F2F2F2', type: ShadingType.CLEAR, color: 'auto' },
          children: [new Paragraph({ children: [new TextRun({ text: l1, bold: true, size: 20, font: 'Calibri' })] })],
        }),
        new DocxTableCell({
          width: { size: 2980, type: WidthType.DXA },
          borders: cellBorders,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: v1 || '', size: 20, font: 'Calibri' })] })],
        }),
        new DocxTableCell({
          width: { size: 1700, type: WidthType.DXA },
          borders: cellBorders,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          shading: { fill: 'F2F2F2', type: ShadingType.CLEAR, color: 'auto' },
          children: [new Paragraph({ children: [new TextRun({ text: l2, bold: true, size: 20, font: 'Calibri' })] })],
        }),
        new DocxTableCell({
          width: { size: 2980, type: WidthType.DXA },
          borders: cellBorders,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: v2 || '', size: 20, font: 'Calibri' })] })],
        }),
      ],
    });

  const detailsTable = new DocxTable({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1700, 2980, 1700, 2980],
    rows: [
      detailRow('Report By:', employeeName, 'Position:', position),
      detailRow('Department:', department, 'Period:', period),
      detailRow('Subject:', subject, 'Date:', dateStr),
    ],
  });

  // ===== Standard letterhead footer (keeps the incorporation date in the footer) =====
  const footerTable = createLetterheadFooter(true);

  const doc = new DocxDocument({
    creator: 'Great Agro Coffee',
    title: `${template.title} - ${refNo}`,
    styles: {
      default: { document: { run: { font: 'Calibri', size: 22 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1080, right: 1080, bottom: 1440, left: 1080 },
        },
      },
      footers: {
        default: new Footer({ children: [footerTable] }),
      },
      children: [
        headerTable,
        regLine,
        letterheadSpacer(120),
        metaTable,
        new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: '' })] }),
        detailsTable,
        new Paragraph({ spacing: { before: 320, after: 80 }, children: [new TextRun({ text: 'REPORT', bold: true, size: 24, font: 'Calibri' })] }),
        new Paragraph({ children: [new TextRun({ text: subject || 'Type your report below…', italics: !subject, color: subject ? '000000' : '888888', size: 22, font: 'Calibri' })] }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        new Paragraph({ children: [new TextRun({ text: '' })] }),
        new Paragraph({ spacing: { before: 600 }, children: [new TextRun({ text: 'Prepared by:', bold: true, size: 22, font: 'Calibri' })] }),
        new Paragraph({ children: [new TextRun({ text: `${employeeName}  —  ${position}`, size: 22, font: 'Calibri' })] }),
        new Paragraph({ children: [new TextRun({ text: `${department} Department`, size: 22, font: 'Calibri' })] }),
        new Paragraph({ spacing: { before: 280 }, children: [new TextRun({ text: 'Signature: ______________________________   Date: ____________________', size: 22, font: 'Calibri' })] }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${template.prefix}-${refNo}.docx`);
};

interface PrefillData {
  beneficiaryName?: string;
  beneficiaryPhone?: string;
  reason?: string;
  payeePosition?: string;
  payeeDepartment?: string;
  payeeEmail?: string;
}

const generatePDF = async (
  template: TemplateConfig,
  employeeName: string,
  department: string,
  position: string,
  prefill: PrefillData = {},
  employeeEmail?: string,
) => {
  const refNo = generateRefNumber(template.prefix);
  // Persist the ref so Finance can validate the printed paper later
  try {
    await supabase.from('expense_template_refs' as any).insert({
      ref: refNo,
      template_type: template.type,
      approval_type: template.approvalType,
      employee_email: employeeEmail || null,
      employee_name: employeeName,
    });
  } catch (e) {
    console.warn('Could not log expense template ref:', e);
  }
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' });

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;

  // Try to load logo
  let logoData: string | null = null;
  try {
    logoData = await loadImageAsBase64(LOGO_URL);
  } catch {
    console.warn('Could not load logo');
  }

  // ===== HEADER (clean, no green background) =====
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(margin, 32, pageW - margin, 32);

  // Logo on the left
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', margin, 3, 26, 26);
    } catch {
      // Logo failed, continue without it
    }
  }

  // Company name
  doc.setTextColor(13, 61, 31);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_NAME, pageW / 2 + 5, 13, { align: 'center' });

  // Parent company
  doc.setTextColor(26, 86, 50);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_TAGLINE, pageW / 2 + 5, 19, { align: 'center' });

  // Location
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${COMPANY_ADDRESS}.`, pageW / 2 + 5, 25);

  // Contact info
  doc.setFontSize(7);
  doc.text('Tel: +256 393 001 626  |  Email: info@greatpearlcoffee.com', pageW / 2 + 5, 31);

  // Title (no background)
  doc.setTextColor(13, 61, 31);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(template.title.toUpperCase(), pageW / 2, 43, { align: 'center' });

  let y = 48;

  // Reference and date info table
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(margin, y, contentW, 14, 1, 1, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('Reference No:', margin + 4, y + 5.5);
  doc.setTextColor(192, 57, 43);
  doc.setFont('helvetica', 'bold');
  doc.text(refNo, margin + 32, y + 5.5);

  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', margin + contentW / 2, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);
  doc.text(dateStr, margin + contentW / 2 + 14, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('Department:', margin + 4, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);
  doc.text(department, margin + 30, y + 11);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('Status:', margin + contentW / 2, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);
  doc.text('PENDING', margin + contentW / 2 + 16, y + 11);

  y += 20;

  // Employee info rows (used by fuel ledger branch)
  const drawInfoRow = (label1: string, val1: string, label2: string, val2: string, rowY: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(margin, rowY, contentW, 8);
    doc.line(margin + contentW / 2, rowY, margin + contentW / 2, rowY + 8);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(label1, margin + 3, rowY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(val1, margin + 28, rowY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(label2, margin + contentW / 2 + 3, rowY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(val2, margin + contentW / 2 + 28, rowY + 5.5);
  };

  // ===== FUEL LEDGER BRANCH =====
  if (template.type === 'fuel-ledger') {
    // Provider summary
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentW, 7);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVICE PROVIDER', margin + 4, y + 5);
    y += 7;

    drawInfoRow('Provider:', prefill.beneficiaryName || '', 'Branch:', prefill.beneficiaryPhone || '', y);
    y += 8;
    drawInfoRow('Period:', prefill.reason || '', 'Issued:', dateStr, y);
    y += 12;

    // Ledger table header
    const cols = [
      { label: '#',           w: 8 },
      { label: 'Date',        w: 22 },
      { label: 'Truck No.',   w: 24 },
      { label: 'Driver Name', w: 38 },
      { label: 'Phone',       w: 26 },
      { label: 'Litres',      w: 16 },
      { label: 'Amount (UGX)',w: 26 },
      { label: 'Signature',   w: contentW - (8 + 22 + 24 + 38 + 26 + 16 + 26) },
    ];
    const rowH = 11;
    const headerH = 8;

    // Header row (filled light)
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(margin, y, contentW, headerH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    let cx = margin;
    cols.forEach((c) => {
      doc.text(c.label, cx + c.w / 2, y + 5.5, { align: 'center' });
      cx += c.w;
    });
    // vertical lines header
    cx = margin;
    cols.forEach((c) => {
      doc.line(cx, y, cx, y + headerH);
      cx += c.w;
    });
    doc.line(margin + contentW, y, margin + contentW, y + headerH);
    y += headerH;

    // 10 empty rows
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    for (let r = 0; r < 10; r++) {
      const ry = y + r * rowH;
      // outer rect
      doc.rect(margin, ry, contentW, rowH);
      // verticals
      let vx = margin;
      cols.forEach((c) => {
        doc.line(vx, ry, vx, ry + rowH);
        vx += c.w;
      });
      // row number
      doc.text(String(r + 1), margin + cols[0].w / 2, ry + rowH / 2 + 1, { align: 'center' });
    }
    y += 10 * rowH + 4;

    // Totals row
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('TOTAL LITRES: __________', margin, y + 5);
    doc.text('TOTAL AMOUNT (UGX): __________________', margin + contentW / 2, y + 5);
    y += 10;
  } else if (template.type === 'department-report') {
    // ===== DEPARTMENT REPORT BRANCH =====
    // Meta block (Report By / Position / Department / Period / Subject)
    const drawMetaRow = (label1: string, val1: string, label2: string, val2: string, rowY: number) => {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(margin, rowY, contentW, 8);
      doc.line(margin + contentW / 2, rowY, margin + contentW / 2, rowY + 8);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(label1, margin + 3, rowY + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
      doc.text(val1 || '', margin + 32, rowY + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(label2, margin + contentW / 2 + 3, rowY + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 20);
      doc.text(val2 || '', margin + contentW / 2 + 32, rowY + 5.5);
    };

    // Section header
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentW, 7);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORT DETAILS', margin + 4, y + 5);
    y += 7;

    const subject = prefill.reason || '';
    drawMetaRow('Report By:', employeeName, 'Position:', position, y); y += 8;
    drawMetaRow('Department:', department, 'Period:', prefill.beneficiaryPhone || '', y); y += 8;
    drawMetaRow('Date:', dateStr, 'Subject:', prefill.beneficiaryName || subject.slice(0, 60), y); y += 12;

    // Body section header
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentW, 7);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORT BODY', margin + 4, y + 5);
    y += 10;

    // Lined writing area
    const bodyBottom = 250;
    const lineGap = 7;
    doc.setDrawColor(190, 190, 190);
    doc.setLineWidth(0.25);
    let ly = y + 4;
    while (ly < bodyBottom) {
      doc.line(margin, ly, margin + contentW, ly);
      ly += lineGap;
    }

    // If subject/reason supplied, write it on the first lines
    if (subject) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(20, 20, 20);
      const wrapped = doc.splitTextToSize(subject, contentW - 2);
      let wy = y + 2;
      for (let i = 0; i < wrapped.length && wy < bodyBottom; i++) {
        doc.text(wrapped[i], margin + 1, wy);
        wy += lineGap;
      }
    }

    y = bodyBottom + 4;
  } else {
  // Request Details section (outlined, no fill)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentW, 7);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('REQUEST DETAILS', margin + 4, y + 5);
  y += 12;

  // Pay-To / Beneficiary block (used by salary-request and any prefill that names a payee)
  if (prefill.beneficiaryName) {
    const payToH = 18;
    doc.setFillColor(252, 248, 235);
    doc.setDrawColor(192, 144, 0);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentW, payToH, 1.5, 1.5, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(140, 90, 0);
    doc.text('PAY TO (BENEFICIARY)', margin + 4, y + 5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text(prefill.beneficiaryName, margin + 4, y + 10.5);

    const meta: string[] = [];
    if (prefill.payeePosition) meta.push(prefill.payeePosition);
    if (prefill.payeeDepartment) meta.push(prefill.payeeDepartment);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    if (meta.length) doc.text(meta.join('  •  '), margin + 4, y + 14.5);

    const contactParts: string[] = [];
    if (prefill.beneficiaryPhone) contactParts.push(`Phone/Acct: ${prefill.beneficiaryPhone}`);
    if (prefill.payeeEmail) contactParts.push(prefill.payeeEmail);
    if (contactParts.length) {
      doc.text(contactParts.join('   '), margin + 4, y + (meta.length ? 17.5 : 14.5));
    }
    y += payToH + 3;
  }

  // Form fields
  template.fields.forEach((field) => {
    const lines = field.lines || 1;
    const lower = field.label.toLowerCase();
    let prefillValue: string | undefined;
    if (prefill.beneficiaryName && (lower.includes('service provider name') || lower.includes('beneficiary'))) {
      prefillValue = prefill.beneficiaryName;
    } else if (prefill.beneficiaryPhone && (lower.includes('phone') || lower.includes('contact') || lower.includes('account number'))) {
      prefillValue = prefill.beneficiaryPhone;
    } else if (prefill.reason && (lower.includes('reason') || lower.includes('justification') || lower.includes('description') || lower.includes('service provided') || lower.includes('purpose'))) {
      prefillValue = prefill.reason;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text(`${field.label}:`, margin, y);
    y += 5;

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    for (let i = 0; i < lines; i++) {
      const lineY = y + i * 6;
      doc.line(margin, lineY + 4, margin + contentW, lineY + 4);
    }
    if (prefillValue) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(20, 20, 20);
      const wrapped = doc.splitTextToSize(prefillValue, contentW - 2);
      const maxLines = Math.min(lines, wrapped.length);
      for (let i = 0; i < maxLines; i++) {
        doc.text(wrapped[i], margin + 1, y + i * 6 + 3);
      }
    }
    y += lines * 6 + 3;
  });
  }

  // Approval section
  y += 3;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentW, 7);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('APPROVAL SECTION', margin + 4, y + 5);
  y += 12;

  const boxW = (contentW - 8) / 3;
  const boxH = 26;
  const boxes = [
    { title: 'Requested By', subtitle: '(Employee Signature & Date)' },
    { title: 'Admin Approval', subtitle: '(Signature & Date)' },
    { title: 'Finance Approval', subtitle: '(Signature & Date)' },
  ];

  boxes.forEach((box, i) => {
    const bx = margin + i * (boxW + 4);

    // Box header
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, y, boxW, boxH, 1, 1, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(box.title, bx + boxW / 2, y + 5, { align: 'center' });

    // Name line
    doc.setDrawColor(150, 150, 150);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text('Name:', bx + 3, y + 11);
    doc.line(bx + 14, y + 11, bx + boxW - 3, y + 11);

    // Signature line
    doc.text('Sign:', bx + 3, y + 17);
    doc.line(bx + 14, y + 17, bx + boxW - 3, y + 17);

    // Date line
    doc.text('Date:', bx + 3, y + 23);
    doc.line(bx + 14, y + 23, bx + boxW - 3, y + 23);
  });

  // Footer
  const footerY = 282;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageW - margin, footerY);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 110);
  doc.text(`Ref: ${refNo}  |  This form must be submitted to the Finance Department with all supporting documents.`, pageW / 2, footerY + 5, { align: 'center' });
  doc.text(`Great Agro Coffee  |  ${COMPANY_TAGLINE}  |  ${COMPANY_ADDRESS}  |  Internal Use Only`, pageW / 2, footerY + 10, { align: 'center' });

  // Open in new tab and trigger print, also save copy
  const blobUrl = doc.output('bloburl');
  const printWin = window.open(blobUrl as unknown as string, '_blank');
  if (printWin) {
    printWin.addEventListener('load', () => {
      try { printWin.focus(); printWin.print(); } catch { /* noop */ }
    });
  }
  doc.save(`${template.prefix}-${refNo}.pdf`);
};

const ExpenseTemplateDownload = () => {
  const { employee } = useAuth();
  const [downloading, setDownloading] = useState<TemplateType | null>(null);
  const [prefillOpen, setPrefillOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<TemplateConfig | null>(null);
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; phone?: string; email?: string; position?: string; department?: string }>>([]);
  const [selectedPayeeId, setSelectedPayeeId] = useState<string>('');

  // Load active employees once (used by the Salary Request payee selector)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('employees')
          .select('id, name, phone, email, position, department, disabled')
          .order('name', { ascending: true });
        if (cancelled) return;
        const list = (data || [])
          .filter((e: any) => !e.disabled && e.name)
          .map((e: any) => ({
            id: e.id,
            name: e.name,
            phone: e.phone || '',
            email: e.email || '',
            position: e.position || '',
            department: e.department || '',
          }));
        setEmployees(list);
      } catch (err) {
        console.warn('Could not load employees for payee selector:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedPayee = useMemo(
    () => employees.find((e) => e.id === selectedPayeeId),
    [employees, selectedPayeeId],
  );

  const buildPrefill = (): PrefillData => ({
    beneficiaryName,
    beneficiaryPhone,
    reason,
    payeePosition: selectedPayee?.position,
    payeeDepartment: selectedPayee?.department,
    payeeEmail: selectedPayee?.email,
  });

  const handleDownload = (template: TemplateConfig) => {
    if (!employee) return;
    setActiveTemplate(template);
    // For Salary Request, default the payee to the current user so it's never blank
    if (template.type === 'salary-request') {
      const me = employees.find((e) => e.email && employee.email && e.email.toLowerCase() === employee.email.toLowerCase());
      setSelectedPayeeId(me?.id || '');
      setBeneficiaryName(me?.name || employee.name || '');
      setBeneficiaryPhone(me?.phone || '');
    } else {
      setSelectedPayeeId('');
      setBeneficiaryName('');
      setBeneficiaryPhone('');
    }
    setReason('');
    setAmount('');
    setPrefillOpen(true);
  };

  const runGenerate = async (prefill: PrefillData) => {
    if (!employee || !activeTemplate) return;
    const template = activeTemplate;
    setDownloading(template.type);
    setPrefillOpen(false);

    try {
      if (template.type === 'department-report') {
        await generateDepartmentReportDocx(
          template,
          employee.name || 'N/A',
          employee.department || 'N/A',
          employee.position || 'N/A',
          prefill,
          employee.email,
        );
      } else {
        await generatePDF(
          template,
          employee.name || 'N/A',
          employee.department || 'N/A',
          employee.position || 'N/A',
          prefill,
          employee.email,
        );
      }
    } catch (err) {
      console.error('Template generation error:', err);
    } finally {
      setTimeout(() => setDownloading(null), 500);
    }
  };

  const submitForApproval = async () => {
    if (!employee || !activeTemplate) return;
    const isFuel = activeTemplate.type === 'fuel-ledger';
    const isReport = activeTemplate.type === 'department-report';
    if (isReport) {
      // Reports are printable only — no approval workflow
      await runGenerate(buildPrefill());
      return;
    }
    const amt = parseFloat(amount);
    if (!isFuel && (!amt || amt <= 0)) {
      toast({ title: 'Amount required', description: 'Please enter a valid amount before submitting for approval.', variant: 'destructive' });
      return;
    }
    if (!isFuel && !reason.trim()) {
      toast({ title: 'Reason required', description: 'Please enter a reason for this request.', variant: 'destructive' });
      return;
    }
    if (isFuel && !beneficiaryName.trim()) {
      toast({ title: 'Provider required', description: 'Please enter the service provider (e.g. Total Energies).', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const title = beneficiaryName
        ? `${activeTemplate.title} - ${beneficiaryName}`
        : activeTemplate.title;
      const description = [
        beneficiaryName ? `Recipient: ${beneficiaryName}` : null,
        beneficiaryPhone ? `Phone/Account: ${beneficiaryPhone}` : null,
        `Reason: ${reason}`,
      ].filter(Boolean).join('\n');

      const { error } = await supabase
        .from('approval_requests')
        .insert({
          type: activeTemplate.approvalType,
          title,
          description,
          amount: isFuel ? 0 : amt,
          requestedby: employee.email,
          requestedby_name: employee.name,
          requestedby_position: employee.position,
          department: employee.department,
          daterequested: new Date().toISOString().split('T')[0],
          priority: 'Medium',
          status: 'Pending Admin',
          approval_stage: 'pending_admin',
          requires_three_approvals: !isFuel && amt > 50000,
          details: JSON.stringify({
            beneficiary_name: beneficiaryName || null,
            beneficiary_phone: beneficiaryPhone || null,
            is_fuel_ledger: isFuel,
          }),
        } as any);

      if (error) throw error;

      toast({ title: 'Submitted for approval', description: 'Generating your printable copy now…' });
      await runGenerate(buildPrefill());
    } catch (err: any) {
      console.error('Submit for approval error:', err);
      toast({ title: 'Submission failed', description: err?.message || 'Could not submit for approval.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          <strong>One-page workflow:</strong> Pick a form, fill in the recipient and amount, then submit for approval — your printable copy is generated at the same time.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map((template) => (
          <Card key={template.type} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {template.icon}
                {template.title}
              </CardTitle>
              <CardDescription className="text-xs">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleDownload(template)}
                disabled={downloading === template.type}
                className="w-full gap-2"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                {downloading === template.type ? 'Generating...' : 'Download Template'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={prefillOpen} onOpenChange={setPrefillOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeTemplate?.title || 'Request details'}</DialogTitle>
            <DialogDescription>
              {activeTemplate?.type === 'fuel-ledger'
                ? 'Enter the service provider details. The printable ledger has 10 blank rows for the station to fill in (date, truck, driver, phone, litres, amount, signature) plus our reference and approval block.'
                : activeTemplate?.type === 'department-report'
                  ? 'Enter the report subject and period. A printable report sheet with the company header, your name, department and a lined writing area will be generated.'
                  : 'Enter who the money is for, the amount, and the reason. Submit for approval and a printable copy will be generated.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {activeTemplate?.type === 'salary-request' && (
              <div>
                <Label htmlFor="payee-select">Pay To (Select Employee)</Label>
                <Select
                  value={selectedPayeeId}
                  onValueChange={(val) => {
                    setSelectedPayeeId(val);
                    const p = employees.find((e) => e.id === val);
                    if (p) {
                      setBeneficiaryName(p.name);
                      setBeneficiaryPhone(p.phone || '');
                    }
                  }}
                >
                  <SelectTrigger id="payee-select">
                    <SelectValue placeholder={employees.length ? 'Choose the employee to be paid' : 'Loading employees…'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}{e.position ? ` — ${e.position}` : ''}{e.department ? ` (${e.department})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  The selected employee's name, position and department will appear on the printed form.
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="ben-name">
                {activeTemplate?.type === 'fuel-ledger'
                  ? 'Service Provider (e.g. Total Energies)'
                  : activeTemplate?.type === 'salary-request'
                    ? 'Beneficiary Name (auto-filled)'
                    : activeTemplate?.type === 'department-report'
                      ? 'Report Subject / Title'
                      : 'Recipient / Service Provider Name'}
              </Label>
              <Input
                id="ben-name"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                placeholder={
                  activeTemplate?.type === 'fuel-ledger'
                    ? 'Total Energies Kasese'
                    : activeTemplate?.type === 'department-report'
                      ? 'e.g. Weekly Quality Department Report'
                      : 'e.g. John Mukasa'
                }
                readOnly={activeTemplate?.type === 'salary-request' && !!selectedPayeeId}
              />
            </div>
            <div>
              <Label htmlFor="ben-phone">
                {activeTemplate?.type === 'fuel-ledger'
                  ? 'Branch / Location'
                  : activeTemplate?.type === 'department-report'
                    ? 'Reporting Period (e.g. May 2026)'
                    : 'Phone / Account Number'}
              </Label>
              <Input
                id="ben-phone"
                value={beneficiaryPhone}
                onChange={(e) => setBeneficiaryPhone(e.target.value)}
                placeholder={
                  activeTemplate?.type === 'fuel-ledger'
                    ? 'e.g. Kasese Town Branch'
                    : activeTemplate?.type === 'department-report'
                      ? 'e.g. May 2026 / Week 22'
                      : 'e.g. 0772 123 456'
                }
              />
            </div>
            {activeTemplate?.type !== 'fuel-ledger' && activeTemplate?.type !== 'department-report' && (
            <div>
              <Label htmlFor="ben-amount">Amount (UGX)</Label>
              <Input id="ben-amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000" />
            </div>
            )}
            <div>
              <Label htmlFor="ben-reason">
                {activeTemplate?.type === 'fuel-ledger'
                  ? 'Period Covered (optional)'
                  : activeTemplate?.type === 'department-report'
                    ? 'Report Summary / Opening Paragraph (optional)'
                    : 'Reason'}
              </Label>
              <Textarea
                id="ben-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  activeTemplate?.type === 'fuel-ledger'
                    ? 'e.g. May 2026'
                    : activeTemplate?.type === 'department-report'
                      ? 'Optional — a few opening lines that will be printed at the top of the body area'
                      : 'Why is this payment needed?'
                }
                rows={activeTemplate?.type === 'fuel-ledger' ? 1 : 3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="ghost" onClick={() => runGenerate({})} disabled={submitting}>Print blank only</Button>
            <Button variant="outline" onClick={() => runGenerate(buildPrefill())} disabled={submitting}>
              Print without submitting
            </Button>
            {activeTemplate?.type !== 'department-report' && (
              <Button onClick={submitForApproval} disabled={submitting}>
                {submitting ? 'Submitting…' : activeTemplate?.type === 'fuel-ledger' ? 'Log & Print Ledger' : 'Submit for Approval & Print'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseTemplateDownload;
