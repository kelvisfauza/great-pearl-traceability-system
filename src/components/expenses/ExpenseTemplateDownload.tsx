import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, ShoppingCart, Coffee, Wallet, Info, Truck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { jsPDF } from 'jspdf';

const LOGO_URL = '/lovable-uploads/great-agro-coffee-logo.png';

const generateRefNumber = (prefix: string) => {
  const date = new Date();
  const yr = date.getFullYear().toString().slice(-2);
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const dy = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${yr}${mo}${dy}-${rand}`;
};

type TemplateType = 'cash-requisition' | 'personal-expense' | 'salary-request' | 'service-provider-requisition';

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
  {
    type: 'service-provider-requisition',
    title: 'Service Provider Requisition',
    prefix: 'SPR',
    icon: <Truck className="h-5 w-5" />,
    description: 'Request payment for external service providers (transport, repairs, consultants, etc.)',
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

const generatePDF = async (template: TemplateConfig, employeeName: string, department: string, position: string) => {
  const refNo = generateRefNumber(template.prefix);
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

  // ===== HEADER (matching GRN style) =====
  // Dark green header background
  doc.setFillColor(13, 61, 31); // #0d3d1f - same as GRN
  doc.rect(0, 0, pageW, 32, 'F');

  // Logo on the left
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', margin, 3, 26, 26);
    } catch {
      // Logo failed, continue without it
    }
  }

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('GREAT AGRO COFFEE LTD', pageW / 2 + 5, 13, { align: 'center' });

  // Location
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Kasese, Uganda.', pageW / 2 + 5, 19);

  // Contact info
  doc.setFontSize(7);
  doc.text('Tel: +256 393 001 626  |  Email: info@greatpearlcoffee.com', pageW / 2 + 5, 25);

  // Gold title bar (like GRN)
  doc.setFillColor(212, 160, 23);
  doc.rect(0, 32, pageW, 9, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(template.title.toUpperCase(), pageW / 2, 38.5, { align: 'center' });

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

  // Employee details section
  doc.setFillColor(13, 61, 31);
  doc.rect(margin, y, contentW, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE DETAILS', margin + 4, y + 5);
  y += 7;

  // Employee info rows
  const drawInfoRow = (label1: string, val1: string, label2: string, val2: string, rowY: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(margin, rowY, contentW, 8);
    doc.line(margin + contentW / 2, rowY, margin + contentW / 2, rowY + 8);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(label1, margin + 3, rowY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(val1, margin + 28, rowY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(label2, margin + contentW / 2 + 3, rowY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(val2, margin + contentW / 2 + 28, rowY + 5.5);
  };

  drawInfoRow('Full Name:', employeeName, 'Position:', position || 'N/A', y);
  y += 8;
  drawInfoRow('Department:', department, 'Date:', dateStr, y);
  y += 14;

  // Request Details section
  doc.setFillColor(13, 61, 31);
  doc.rect(margin, y, contentW, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('REQUEST DETAILS', margin + 4, y + 5);
  y += 12;

  // Form fields
  template.fields.forEach((field) => {
    const lines = field.lines || 1;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text(`${field.label}:`, margin, y);
    y += 5;

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    for (let i = 0; i < lines; i++) {
      const lineY = y + i * 7;
      doc.line(margin, lineY + 4, margin + contentW, lineY + 4);
    }
    y += lines * 7 + 4;
  });

  // Approval section
  y += 3;
  doc.setFillColor(13, 61, 31);
  doc.rect(margin, y, contentW, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('APPROVAL SECTION', margin + 4, y + 5);
  y += 12;

  const boxW = (contentW - 8) / 3;
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
    doc.roundedRect(bx, y, boxW, 30, 1, 1, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 61, 31);
    doc.text(box.title, bx + boxW / 2, y + 5, { align: 'center' });

    // Name line
    doc.setDrawColor(150, 150, 150);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text('Name:', bx + 3, y + 12);
    doc.line(bx + 14, y + 12, bx + boxW - 3, y + 12);

    // Signature line
    doc.text('Sign:', bx + 3, y + 19);
    doc.line(bx + 14, y + 19, bx + boxW - 3, y + 19);

    // Date line
    doc.text('Date:', bx + 3, y + 26);
    doc.line(bx + 14, y + 26, bx + boxW - 3, y + 26);
  });

  // Footer
  const footerY = 282;
  doc.setFillColor(13, 61, 31);
  doc.rect(0, footerY, pageW, 15, 'F');

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text(`Ref: ${refNo}  |  This form must be submitted to the Finance Department with all supporting documents.`, pageW / 2, footerY + 5, { align: 'center' });
  doc.text('Great Agro Coffee Ltd  |  Kasese, Uganda  |  Tel: +256 393 001 626  |  Internal Use Only', pageW / 2, footerY + 10, { align: 'center' });

  doc.save(`${template.prefix}-${refNo}.pdf`);
};

const ExpenseTemplateDownload = () => {
  const { employee } = useAuth();
  const [downloading, setDownloading] = useState<TemplateType | null>(null);

  const handleDownload = async (template: TemplateConfig) => {
    if (!employee) return;
    setDownloading(template.type);

    try {
      await generatePDF(
        template,
        employee.name || 'N/A',
        employee.department || 'N/A',
        employee.position || 'N/A'
      );
    } catch (err) {
      console.error('PDF generation error:', err);
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
