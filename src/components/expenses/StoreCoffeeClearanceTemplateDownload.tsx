import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PackageOpen, Download, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';

const LOGO_URL = '/lovable-uploads/great-agro-coffee-logo.png';

const loadImageAsBase64 = (url: string): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

export const generateStoreCoffeeClearanceForm = async () => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const margin = 12;
  const contentW = pageW - margin * 2;

  const logoData = await loadImageAsBase64(LOGO_URL);
  if (logoData) {
    try { doc.addImage(logoData, 'PNG', margin, 6, 16, 16); } catch { /* ignore */ }
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('GREAT AGRO COFFEE', margin + 20, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text('a member of YEDA COFFEE COMPANY LIMITED', margin + 20, 16.5);
  doc.text('P.O Box 431420, Kasese, Uganda  |  +256 393 001 626 / +256 393 101 103', margin + 20, 20);
  doc.text('info@greatpearlcoffee.com', margin + 20, 23);

  doc.setLineWidth(0.5);
  doc.line(margin, 26, pageW - margin, 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('STORE COFFEE CLEARANCE / RELEASE FORM', pageW / 2, 32.5, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Form No: ________________', pageW - margin, 32.5, { align: 'right' });

  doc.setLineWidth(0.35);
  let y = 37;

  const rowH = 9;
  const half = contentW / 2;
  const cell = (label: string, x: number, w: number, yy: number) => {
    doc.rect(x, yy, w, rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.text(label, x + 2, yy + 3.6);
  };

  // Header fields
  cell('DATE', margin, half, y);
  cell('WAREHOUSE / STORE', margin + half, half, y);
  y += rowH;
  cell('DESTINATION / BUYER', margin, half, y);
  cell('VEHICLE / TRUCK NO.', margin + half, half, y);
  y += rowH;
  cell('DRIVER NAME', margin, half, y);
  cell('DRIVER TEL.', margin + half, half, y);
  y += rowH + 4;

  // Coffee released table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('COFFEE RELEASED FROM STORE', margin, y);
  y += 2;

  const cols = [
    { label: 'No.', w: 0.07 },
    { label: 'Lot / Batch Ref.', w: 0.27 },
    { label: 'Coffee Type', w: 0.24 },
    { label: 'Bags', w: 0.14 },
    { label: 'Weight (Kg)', w: 0.28 },
  ];
  const headH = 7;
  let x = margin;
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, contentW, headH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  cols.forEach((c) => {
    const cw = contentW * c.w;
    doc.rect(x, y, cw, headH);
    doc.text(c.label, x + cw / 2, y + headH / 2 + 1.4, { align: 'center' });
    x += cw;
  });
  y += headH;

  const rowCount = 12;
  doc.setFont('helvetica', 'normal');
  for (let r = 0; r < rowCount; r++) {
    x = margin;
    cols.forEach((c, ci) => {
      const cw = contentW * c.w;
      doc.rect(x, y, cw, 9);
      if (ci === 0) {
        doc.setFontSize(7);
        doc.text(String(r + 1), x + cw / 2, y + 6, { align: 'center' });
      }
      x += cw;
    });
    y += 9;
  }

  // Totals
  x = margin;
  doc.setFont('helvetica', 'bold');
  cols.forEach((c, ci) => {
    const cw = contentW * c.w;
    doc.rect(x, y, cw, 8);
    if (ci === 2) doc.text('TOTAL', x + cw / 2, y + 5.3, { align: 'center' });
    x += cw;
  });
  y += 8 + 6;

  // Remarks
  doc.setFontSize(8);
  doc.text('REMARKS', margin, y);
  doc.rect(margin, y + 1.5, contentW, 16);
  y += 24;

  // Signatures (3 across)
  const sigW = (contentW - 20) / 3;
  const labels = ['Released By — Store Manager', 'Received By — Driver', 'Approved By — Administrator'];
  labels.forEach((lbl, i) => {
    const sx = margin + i * (sigW + 10);
    doc.setLineWidth(0.35);
    doc.line(sx, y, sx + sigW, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.text(doc.splitTextToSize(`${lbl}\n(Name, Signature & Date)`, sigW), sx, y + 4.5);
  });

  doc.setLineWidth(0.5);
  doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.4);
  doc.setTextColor(80, 80, 80);
  doc.text(
    'Great Agro Coffee  |  a member of YEDA Coffee Company Limited  |  P.O Box 431420, Kasese, Uganda',
    pageW / 2,
    pageH - 9,
    { align: 'center' },
  );

  doc.save('Store-Coffee-Clearance-Form.pdf');
  try {
    const blobUrl = doc.output('bloburl') as unknown as string;
    const printWin = window.open(blobUrl, '_blank');
    if (printWin) {
      printWin.addEventListener('load', () => {
        try { printWin.focus(); printWin.print(); } catch { /* ignore */ }
      });
    }
  } catch { /* ignore */ }
};

const StoreCoffeeClearanceTemplateDownload = () => {
  const [busy, setBusy] = useState(false);

  const handleGenerate = async () => {
    try {
      setBusy(true);
      await generateStoreCoffeeClearanceForm();
      toast({
        title: 'Store clearance form ready',
        description: 'PDF downloaded and print preview opened — fill it in by hand.',
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'Failed to generate the template.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PackageOpen className="h-5 w-5 text-primary" />
          Store Coffee Clearance / Release Form
        </CardTitle>
        <CardDescription className="text-xs">
          A simple A4 form for clearing coffee out of the store — date, warehouse, buyer, truck and driver,
          a 12-line coffee release table (lot, type, bags, weight) with totals, remarks, and three signature
          lines (Store Manager, Driver, Administrator). Print and fill by hand.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleGenerate} disabled={busy} className="w-full gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download Store Clearance Form
        </Button>
      </CardContent>
    </Card>
  );
};

export default StoreCoffeeClearanceTemplateDownload;
