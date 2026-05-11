import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Plane } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';

const LOGO_URL = '/lovable-uploads/great-agro-coffee-logo.png';

const loadImageAsBase64 = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load logo'));
    img.src = url;
  });

const generateRefNumber = () => {
  const d = new Date();
  const yr = d.getFullYear().toString().slice(-2);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PD-${yr}${mo}${dy}-${rand}`;
};

interface PerDiemFormData {
  destination: string;
  purpose: string;
  startDate: string;
  endDate: string;
  days: string;
  ratePerDay: string;
  transport: string;
  accommodation: string;
  other: string;
  notes: string;
}

const generatePDF = async (
  employee: { name?: string; email?: string; department?: string; position?: string; phone?: string },
  data: PerDiemFormData,
) => {
  const refNo = generateRefNumber();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' });

  const days = parseFloat(data.days) || 0;
  const rate = parseFloat(data.ratePerDay) || 0;
  const transport = parseFloat(data.transport) || 0;
  const accommodation = parseFloat(data.accommodation) || 0;
  const other = parseFloat(data.other) || 0;
  const perDiemSubtotal = days * rate;
  const grandTotal = perDiemSubtotal + transport + accommodation + other;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;

  let logoData: string | null = null;
  try { logoData = await loadImageAsBase64(LOGO_URL); } catch {}

  // Header
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(margin, 32, pageW - margin, 32);

  if (logoData) {
    try { doc.addImage(logoData, 'PNG', margin, 3, 26, 26); } catch {}
  }

  doc.setTextColor(13, 61, 31);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('GREAT AGRO COFFEE LTD', pageW / 2 + 5, 13, { align: 'center' });

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Kasese, Uganda.', pageW / 2 + 5, 19);
  doc.setFontSize(7);
  doc.text('Tel: +256 393 001 626  |  Email: info@greatpearlcoffee.com', pageW / 2 + 5, 25);

  doc.setTextColor(13, 61, 31);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('PER DIEM REQUEST FORM', pageW / 2, 39, { align: 'center' });

  let y = 48;

  // Ref + date strip
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(margin, y, contentW, 9, 1, 1, 'FD');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('Reference No:', margin + 4, y + 6);
  doc.setTextColor(192, 57, 43);
  doc.text(refNo, margin + 32, y + 6);
  doc.setTextColor(80, 80, 80);
  doc.text('Date Issued:', margin + contentW / 2, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 51, 51);
  doc.text(dateStr, margin + contentW / 2 + 22, y + 6);
  y += 13;

  // Employee Details box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentW, 7);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('EMPLOYEE DETAILS', margin + 4, y + 5);
  y += 7;

  const drawRow = (l1: string, v1: string, l2: string, v2: string) => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentW, 8);
    doc.line(margin + contentW / 2, y, margin + contentW / 2, y + 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(l1, margin + 3, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    doc.text(v1 || '—', margin + 30, y + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(l2, margin + contentW / 2 + 3, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    doc.text(v2 || '—', margin + contentW / 2 + 30, y + 5.5);
    y += 8;
  };

  drawRow('Name:', employee.name || '', 'Department:', employee.department || '');
  drawRow('Position:', employee.position || '', 'Phone:', employee.phone || '');
  drawRow('Email:', employee.email || '', 'Issued:', dateStr);

  y += 4;

  // Trip Details
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, y, contentW, 7);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('TRIP DETAILS', margin + 4, y + 5);
  y += 7;

  drawRow('Destination:', data.destination, 'Days:', data.days);
  drawRow('Start Date:', data.startDate, 'End Date:', data.endDate);

  // Purpose
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, contentW, 16);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('Purpose / Justification:', margin + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);
  const purposeLines = doc.splitTextToSize(data.purpose || '—', contentW - 6);
  doc.text(purposeLines.slice(0, 2), margin + 3, y + 10);
  y += 20;

  // Cost Breakdown
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, y, contentW, 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('COST BREAKDOWN (UGX)', margin + 4, y + 5);
  y += 7;

  const fmt = (n: number) => n.toLocaleString();
  const costRow = (label: string, qty: string, value: string, total: string, bold = false) => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentW, 8);
    const c1 = margin + contentW * 0.45;
    const c2 = margin + contentW * 0.65;
    const c3 = margin + contentW * 0.82;
    doc.line(c1, y, c1, y + 8);
    doc.line(c2, y, c2, y + 8);
    doc.line(c3, y, c3, y + 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(20, 20, 20);
    doc.text(label, margin + 3, y + 5.5);
    doc.text(qty, c1 + 3, y + 5.5);
    doc.text(value, c2 + 3, y + 5.5);
    doc.text(total, c3 + 3, y + 5.5);
    y += 8;
  };

  // Header
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentW, 7, 'F');
  const c1 = margin + contentW * 0.45;
  const c2 = margin + contentW * 0.65;
  const c3 = margin + contentW * 0.82;
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, contentW, 7);
  doc.line(c1, y, c1, y + 7);
  doc.line(c2, y, c2, y + 7);
  doc.line(c3, y, c3, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Item', margin + 3, y + 5);
  doc.text('Qty / Days', c1 + 3, y + 5);
  doc.text('Rate', c2 + 3, y + 5);
  doc.text('Total', c3 + 3, y + 5);
  y += 7;

  costRow('Per Diem Allowance', `${days || ''}`, fmt(rate), fmt(perDiemSubtotal));
  costRow('Transport', '—', '—', fmt(transport));
  costRow('Accommodation', '—', '—', fmt(accommodation));
  costRow('Other Expenses', '—', '—', fmt(other));

  // Grand total
  doc.setFillColor(232, 245, 233);
  doc.rect(margin, y, contentW, 9, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentW, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(13, 61, 31);
  doc.text('GRAND TOTAL (UGX)', margin + 3, y + 6);
  doc.text(fmt(grandTotal), margin + contentW - 3, y + 6, { align: 'right' });
  y += 14;

  // Notes
  if (data.notes) {
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, contentW, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('Notes:', margin + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    const nLines = doc.splitTextToSize(data.notes, contentW - 6);
    doc.text(nLines.slice(0, 2), margin + 3, y + 10);
    y += 18;
  }

  // Approval section
  y += 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentW, 7);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('APPROVAL SECTION', margin + 4, y + 5);
  y += 12;

  const boxW = (contentW - 8) / 3;
  const boxes = [
    { title: 'Requested By' },
    { title: 'Admin Approval' },
    { title: 'Finance Approval' },
  ];
  boxes.forEach((b, i) => {
    const bx = margin + i * (boxW + 4);
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, y, boxW, 30, 1, 1, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(b.title, bx + boxW / 2, y + 5, { align: 'center' });
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.setDrawColor(150, 150, 150);
    doc.text('Name:', bx + 3, y + 12); doc.line(bx + 14, y + 12, bx + boxW - 3, y + 12);
    doc.text('Sign:', bx + 3, y + 19);  doc.line(bx + 14, y + 19, bx + boxW - 3, y + 19);
    doc.text('Date:', bx + 3, y + 26);  doc.line(bx + 14, y + 26, bx + boxW - 3, y + 26);
  });

  // prefill requested-by name in first box
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);
  doc.text(employee.name || '', margin + 15, y + 11);
  doc.text(dateStr, margin + 15, y + 25);

  // Footer
  const footerY = 282;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageW - margin, footerY);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110, 110, 110);
  doc.text(`Ref: ${refNo}  |  Submit to Finance with all supporting documents.`, pageW / 2, footerY + 5, { align: 'center' });
  doc.text('Great Agro Coffee Ltd  |  Kasese, Uganda  |  Tel: +256 393 001 626  |  Internal Use Only', pageW / 2, footerY + 10, { align: 'center' });

  const blobUrl = doc.output('bloburl');
  const printWin = window.open(blobUrl as unknown as string, '_blank');
  if (printWin) {
    printWin.addEventListener('load', () => {
      try { printWin.focus(); printWin.print(); } catch {}
    });
  }
  doc.save(`PerDiem-${refNo}.pdf`);
};

const PerDiemTemplateDownload = () => {
  const { employee } = useAuth();
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState<PerDiemFormData>({
    destination: '',
    purpose: '',
    startDate: today,
    endDate: today,
    days: '1',
    ratePerDay: '30000',
    transport: '0',
    accommodation: '0',
    other: '0',
    notes: '',
  });

  const days = parseFloat(form.days) || 0;
  const rate = parseFloat(form.ratePerDay) || 0;
  const grandTotal =
    days * rate +
    (parseFloat(form.transport) || 0) +
    (parseFloat(form.accommodation) || 0) +
    (parseFloat(form.other) || 0);

  const handleGenerate = async () => {
    if (!employee) return;
    if (!form.destination || !form.purpose) {
      toast({ title: 'Missing info', description: 'Please enter destination and purpose.', variant: 'destructive' });
      return;
    }
    setDownloading(true);
    try {
      await generatePDF(
        {
          name: employee.name,
          email: employee.email,
          department: employee.department,
          position: employee.position,
          phone: (employee as any).phone,
        },
        form,
      );
      toast({ title: 'Per Diem form ready', description: 'Form opened for printing and downloaded.' });
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to generate per diem form.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Card className="border-2 border-primary/20 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plane className="h-5 w-5 text-primary" />
            Per Diem Request Form
          </CardTitle>
          <CardDescription className="text-xs">
            Pre-filled with your details and today's date. Add destination, days and rate, then print with the company header.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setOpen(true)} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Open Per Diem Form
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-primary" />
              Per Diem Request
            </DialogTitle>
            <DialogDescription>
              Fields are pre-filled with your information. Edit only the trip-specific fields.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-muted/40 text-sm">
              <div><span className="text-muted-foreground">Name:</span> <strong>{employee?.name}</strong></div>
              <div><span className="text-muted-foreground">Department:</span> <strong>{employee?.department}</strong></div>
              <div><span className="text-muted-foreground">Position:</span> <strong>{employee?.position}</strong></div>
              <div><span className="text-muted-foreground">Date:</span> <strong>{new Date().toLocaleDateString()}</strong></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Destination *</Label>
                <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="e.g. Kampala" />
              </div>
              <div>
                <Label>Days *</Label>
                <Input type="number" min="0" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <div>
                <Label>Rate / Day (UGX)</Label>
                <Input type="number" min="0" value={form.ratePerDay} onChange={(e) => setForm({ ...form, ratePerDay: e.target.value })} />
              </div>
              <div>
                <Label>Transport (UGX)</Label>
                <Input type="number" min="0" value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} />
              </div>
              <div>
                <Label>Accommodation (UGX)</Label>
                <Input type="number" min="0" value={form.accommodation} onChange={(e) => setForm({ ...form, accommodation: e.target.value })} />
              </div>
              <div>
                <Label>Other (UGX)</Label>
                <Input type="number" min="0" value={form.other} onChange={(e) => setForm({ ...form, other: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Purpose / Justification *</Label>
              <Textarea rows={3} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. Field visit to coffee farms in Kasese district" />
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-md bg-primary/5 border border-primary/20">
              <span className="text-sm font-medium">Grand Total</span>
              <span className="text-lg font-bold text-primary">UGX {grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={downloading} className="gap-2">
              <Download className="h-4 w-4" />
              {downloading ? 'Generating...' : 'Generate & Print'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PerDiemTemplateDownload;
