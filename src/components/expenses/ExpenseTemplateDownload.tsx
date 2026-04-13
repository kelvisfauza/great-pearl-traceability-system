import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileText, ShoppingCart, Coffee, Wallet, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const LOGO_URL = 'https://pudfybkyfedeggmokhco.supabase.co/storage/v1/object/public/assets/great-agro-logo.png';

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

const drawTemplate = (template: TemplateConfig, employeeName: string, department: string, position: string) => {
  const refNo = generateRefNumber(template.prefix);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' });

  // Create a canvas to render the PDF
  const canvas = document.createElement('canvas');
  const dpi = 2;
  const w = 595 * dpi; // A4 width in points
  const h = 842 * dpi; // A4 height in points
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpi, dpi);

  const pageW = 595;
  const pageH = 842;
  const margin = 50;
  const contentW = pageW - margin * 2;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, pageW, pageH);

  let y = margin;

  // Header background
  ctx.fillStyle = '#1a5632';
  ctx.fillRect(0, 0, pageW, 90);

  // Company name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('GREAT AGRO COFFEE LTD', pageW / 2, 35);
  
  ctx.font = '10px Arial';
  ctx.fillText('P.O. Box XXXX, Kampala, Uganda | Tel: +256 XXXX XXXX | Email: info@greatagrocoffee.com', pageW / 2, 52);

  // Decorative line
  ctx.fillStyle = '#d4a017';
  ctx.fillRect(0, 88, pageW, 4);

  y = 110;

  // Document title
  ctx.fillStyle = '#1a5632';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(template.title.toUpperCase(), pageW / 2, y);
  y += 30;

  // Reference and date row
  ctx.textAlign = 'left';
  ctx.font = 'bold 10px Arial';
  ctx.fillStyle = '#333333';
  ctx.fillText(`Reference No:`, margin, y);
  ctx.font = '10px Arial';
  ctx.fillStyle = '#c0392b';
  ctx.fillText(refNo, margin + 85, y);

  ctx.textAlign = 'right';
  ctx.font = 'bold 10px Arial';
  ctx.fillStyle = '#333333';
  ctx.fillText(`Date:`, pageW - margin - 100, y);
  ctx.font = '10px Arial';
  ctx.fillStyle = '#333333';
  ctx.fillText(dateStr, pageW - margin, y);
  y += 25;

  // Employee info box
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(margin, y, contentW, 70);
  ctx.strokeRect(margin, y, contentW, 70);

  ctx.textAlign = 'left';
  ctx.font = 'bold 9px Arial';
  ctx.fillStyle = '#666666';
  const infoY = y + 15;
  
  ctx.fillText('EMPLOYEE DETAILS', margin + 10, infoY);
  ctx.font = '10px Arial';
  ctx.fillStyle = '#333333';
  ctx.fillText(`Name: ${employeeName}`, margin + 10, infoY + 18);
  ctx.fillText(`Department: ${department}`, margin + 10, infoY + 34);
  ctx.fillText(`Position: ${position || 'N/A'}`, margin + contentW / 2, infoY + 18);
  ctx.fillText(`Date Generated: ${dateStr}`, margin + contentW / 2, infoY + 34);

  y += 90;

  // Form fields
  ctx.font = 'bold 10px Arial';
  ctx.fillStyle = '#1a5632';
  ctx.fillText('REQUEST DETAILS', margin, y);
  y += 5;
  ctx.fillStyle = '#1a5632';
  ctx.fillRect(margin, y, contentW, 2);
  y += 15;

  template.fields.forEach((field) => {
    const lines = field.lines || 1;
    const fieldH = 15 + lines * 22;

    ctx.font = 'bold 10px Arial';
    ctx.fillStyle = '#333333';
    ctx.fillText(field.label + ':', margin, y + 12);
    y += 18;

    // Draw lines for writing
    for (let i = 0; i < lines; i++) {
      const lineY = y + i * 22;
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(margin, lineY + 15);
      ctx.lineTo(margin + contentW, lineY + 15);
      ctx.stroke();
    }
    y += lines * 22 + 8;
  });

  // Approval section
  y += 10;
  ctx.font = 'bold 10px Arial';
  ctx.fillStyle = '#1a5632';
  ctx.fillText('APPROVAL SECTION', margin, y);
  y += 5;
  ctx.fillRect(margin, y, contentW, 2);
  y += 20;

  const boxW = (contentW - 20) / 3;
  const boxes = [
    { title: 'Requested By', subtitle: '(Employee Signature)' },
    { title: 'Admin Approval', subtitle: '(Signature & Date)' },
    { title: 'Finance Approval', subtitle: '(Signature & Date)' },
  ];

  boxes.forEach((box, i) => {
    const bx = margin + i * (boxW + 10);
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, y, boxW, 80);

    ctx.font = 'bold 9px Arial';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.fillText(box.title, bx + boxW / 2, y + 15);

    // Signature line
    ctx.strokeStyle = '#999999';
    ctx.beginPath();
    ctx.moveTo(bx + 10, y + 55);
    ctx.lineTo(bx + boxW - 10, y + 55);
    ctx.stroke();

    ctx.font = '8px Arial';
    ctx.fillStyle = '#999999';
    ctx.fillText(box.subtitle, bx + boxW / 2, y + 70);
  });

  ctx.textAlign = 'left';
  y += 100;

  // Footer
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, pageH - 50, pageW, 50);
  ctx.fillStyle = '#1a5632';
  ctx.fillRect(0, pageH - 50, pageW, 2);

  ctx.font = '8px Arial';
  ctx.fillStyle = '#999999';
  ctx.textAlign = 'center';
  ctx.fillText(`Ref: ${refNo} | This form must be submitted to the Finance Department with all supporting documents.`, pageW / 2, pageH - 30);
  ctx.fillText('Great Agro Coffee Ltd - Internal Use Only', pageW / 2, pageH - 18);

  return { canvas, refNo };
};

const ExpenseTemplateDownload = () => {
  const { employee } = useAuth();
  const [downloading, setDownloading] = useState<TemplateType | null>(null);

  const handleDownload = async (template: TemplateConfig) => {
    if (!employee) return;
    setDownloading(template.type);

    try {
      const { canvas, refNo } = drawTemplate(
        template,
        employee.name || 'N/A',
        employee.department || 'N/A',
        employee.position || 'N/A'
      );

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${template.prefix}-${refNo}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
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
