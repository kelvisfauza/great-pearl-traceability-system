import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, ShoppingCart, Coffee, Wallet, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { jsPDF } from 'jspdf';

const generateRefNumber = (prefix: string) => {
  const date = new Date();
  const yr = date.getFullYear().toString().slice(-2);
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const dy = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${yr}${mo}${dy}-${rand}`;
};

type TemplateType = 'cash-requisition' | 'personal-expense' | 'salary-request';

interface TemplateConfig {
  type: TemplateType;
  title: string;
  prefix: string;
  icon: React.ReactNode;
  description: string;
  fields: { label: string; lines?: number }[];
}

const templates: TemplateConfig[] = [
  {
    type: 'cash-requisition',
    title: 'Cash Requisition Form',
    prefix: 'CR',
    icon: <ShoppingCart className="h-5 w-5" />,
    description: 'Request money for company purchases or business needs',
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
    fields: [
      { label: 'Request Type (Advance / Mid-Month / End-Month)' },
      { label: 'Amount Requested (UGX)' },
      { label: 'Reason for Request', lines: 4 },
      { label: 'Preferred Payment Method (Cash / Mobile Money / Bank)' },
      { label: 'Mobile Money / Bank Account Number' },
    ],
  },
];

const generatePDF = (template: TemplateConfig, employeeName: string, department: string, position: string) => {
  const refNo = generateRefNumber(template.prefix);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' });

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;

  // Header background
  doc.setFillColor(26, 86, 50);
  doc.rect(0, 0, pageW, 28, 'F');

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GREAT AGRO COFFEE LTD', pageW / 2, 11, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('P.O. Box XXXX, Kampala, Uganda  |  Tel: +256 XXXX XXXX  |  Email: info@greatagrocoffee.com', pageW / 2, 17, { align: 'center' });

  // Gold accent line
  doc.setFillColor(212, 160, 23);
  doc.rect(0, 27, pageW, 1.5, 'F');

  let y = 35;

  // Document title
  doc.setTextColor(26, 86, 50);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(template.title.toUpperCase(), pageW / 2, y, { align: 'center' });
  y += 10;

  // Reference and date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 51, 51);
  doc.text('Reference No:', margin, y);
  doc.setTextColor(192, 57, 43);
  doc.setFont('helvetica', 'normal');
  doc.text(refNo, margin + 28, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 51, 51);
  doc.text('Date:', pageW - margin - 45, y);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, pageW - margin - 35, y);
  y += 8;

  // Employee info box
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(204, 204, 204);
  doc.roundedRect(margin, y, contentW, 22, 2, 2, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('EMPLOYEE DETAILS', margin + 4, y + 5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);
  doc.text(`Name: ${employeeName}`, margin + 4, y + 11);
  doc.text(`Department: ${department}`, margin + 4, y + 17);
  doc.text(`Position: ${position || 'N/A'}`, margin + contentW / 2, y + 11);
  doc.text(`Date Generated: ${dateStr}`, margin + contentW / 2, y + 17);

  y += 28;

  // Section header: REQUEST DETAILS
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 86, 50);
  doc.text('REQUEST DETAILS', margin, y);
  y += 1;
  doc.setDrawColor(26, 86, 50);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentW, y);
  y += 6;

  // Form fields
  template.fields.forEach((field) => {
    const lines = field.lines || 1;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text(`${field.label}:`, margin, y);
    y += 4;

    // Draw dotted lines for writing
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    for (let i = 0; i < lines; i++) {
      const lineY = y + i * 7;
      // Draw dashed line
      const dashLen = 2;
      const gapLen = 1.5;
      let x = margin;
      while (x < margin + contentW) {
        const end = Math.min(x + dashLen, margin + contentW);
        doc.line(x, lineY + 4, end, lineY + 4);
        x = end + gapLen;
      }
    }
    y += lines * 7 + 4;
  });

  // Approval section
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 86, 50);
  doc.text('APPROVAL SECTION', margin, y);
  y += 1;
  doc.setDrawColor(26, 86, 50);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentW, y);
  y += 6;

  const boxW = (contentW - 8) / 3;
  const boxes = [
    { title: 'Requested By', subtitle: '(Employee Signature)' },
    { title: 'Admin Approval', subtitle: '(Signature & Date)' },
    { title: 'Finance Approval', subtitle: '(Signature & Date)' },
  ];

  boxes.forEach((box, i) => {
    const bx = margin + i * (boxW + 4);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, y, boxW, 28, 1, 1, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text(box.title, bx + boxW / 2, y + 5, { align: 'center' });

    // Signature line
    doc.setDrawColor(150, 150, 150);
    doc.line(bx + 5, y + 19, bx + boxW - 5, y + 19);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(box.subtitle, bx + boxW / 2, y + 24, { align: 'center' });
  });

  y += 35;

  // Footer
  const footerY = 287;
  doc.setDrawColor(26, 86, 50);
  doc.setLineWidth(0.5);
  doc.line(0, footerY - 5, pageW, footerY - 5);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text(`Ref: ${refNo}  |  This form must be submitted to the Finance Department with all supporting documents.`, pageW / 2, footerY, { align: 'center' });
  doc.text('Great Agro Coffee Ltd - Internal Use Only', pageW / 2, footerY + 4, { align: 'center' });

  // Save
  doc.save(`${template.prefix}-${refNo}.pdf`);
};

const ExpenseTemplateDownload = () => {
  const { employee } = useAuth();
  const [downloading, setDownloading] = useState<TemplateType | null>(null);

  const handleDownload = (template: TemplateConfig) => {
    if (!employee) return;
    setDownloading(template.type);

    try {
      generatePDF(
        template,
        employee.name || 'N/A',
        employee.department || 'N/A',
        employee.position || 'N/A'
      );
    } finally {
      setTimeout(() => setDownloading(null), 500);
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          <strong>New Process:</strong> Download the appropriate template below, fill it in manually, and submit the physical form to the Finance Department along with any supporting documents.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
    </div>
  );
};

export default ExpenseTemplateDownload;
