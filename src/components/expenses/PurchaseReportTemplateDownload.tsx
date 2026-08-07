import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Download, Warehouse, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import { buildDocumentQr, drawQrBlock } from '@/utils/pdfQrCode';

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

const COLUMNS: { label: string; w: number }[] = [
  { label: '#', w: 0.04 },
  { label: 'Coffee Type', w: 0.16 },
  { label: 'Opening\nStock (Kg)', w: 0.12 },
  { label: 'Coffee Bought\nToday (Kg)', w: 0.13 },
  { label: 'Coffee Sold\n(Kg)', w: 0.11 },
  { label: 'Bags', w: 0.07 },
  { label: 'Closing\nStock (Kg)', w: 0.12 },
  { label: 'Rejected\nCoffee (Kg)', w: 0.11 },
  { label: 'Unbought /\nPending (Kg)', w: 0.14 },
];

const COFFEE_TYPES = ['ARABICA', 'ROBUSTA'];

const generatePurchaseReport = async (reportDate: string, warehouse: string) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const margin = 10;
  const contentW = pageW - margin * 2;

  const logoData = await loadImageAsBase64(LOGO_URL);

  if (logoData) {
    try { doc.addImage(logoData, 'PNG', margin, 4, 16, 16); } catch {}
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('GREAT AGRO COFFEE', margin + 20, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text('a member of YEDA COFFEE COMPANY LIMITED', margin + 20, 14.5);
  doc.text('P.O Box 431420, Kasese, Uganda  |  +256 393 001 626 / +256 393 101 103', margin + 20, 18);
  doc.text('info@greatpearlcoffee.com', margin + 20, 21);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, 24, pageW - margin, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('DAILY PURCHASE / STOCK REPORT', pageW / 2, 31, { align: 'center' });

  // Meta boxes
  let y = 35;
  const metaH = 9;
  const halfW = contentW / 2;
  doc.setLineWidth(0.35);
  doc.rect(margin, y, halfW, metaH);
  doc.rect(margin + halfW, y, halfW, metaH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Report Date:', margin + 3, y + metaH / 2 + 1);
  doc.text('Warehouse:', margin + halfW + 3, y + metaH / 2 + 1);
  doc.setFont('helvetica', 'normal');
  doc.text(reportDate || '____________________', margin + 24, y + metaH / 2 + 1);
  doc.text(warehouse || '____________________', margin + halfW + 24, y + metaH / 2 + 1);

  // Table
  y += metaH + 4;
  const headH = 11;
  let x = margin;
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, contentW, headH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  COLUMNS.forEach((c) => {
    const cw = contentW * c.w;
    doc.rect(x, y, cw, headH);
    const lines = c.label.split('\n');
    lines.forEach((ln, li) => {
      doc.text(ln, x + cw / 2, y + (lines.length === 1 ? headH / 2 + 1.5 : 4.5 + li * 4), { align: 'center' });
    });
    x += cw;
  });

  y += headH;
  const rowH = 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  for (let r = 0; r < COFFEE_TYPES.length; r++) {
    x = margin;
    COLUMNS.forEach((c, ci) => {
      const cw = contentW * c.w;
      doc.rect(x, y, cw, rowH);
      if (ci === 0) {
        doc.setTextColor(90, 90, 90);
        doc.text(String(r + 1), x + cw / 2, y + rowH / 2 + 1.2, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      }
      if (ci === 1) {
        doc.setFont('helvetica', 'bold');
        doc.text(COFFEE_TYPES[r], x + 2.5, y + rowH / 2 + 1.2);
        doc.setFont('helvetica', 'normal');
      }
      x += cw;
    });
    y += rowH;
  }

  // Totals row
  x = margin;
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, contentW, rowH, 'F');
  COLUMNS.forEach((c, ci) => {
    const cw = contentW * c.w;
    doc.rect(x, y, cw, rowH);
    if (ci === 1) {
      doc.setFont('helvetica', 'bold');
      doc.text('TOTALS', x + 2, y + rowH / 2 + 1.2);
      doc.setFont('helvetica', 'normal');
    }
    x += cw;
  });
  y += rowH + 14;

  // Remarks box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Remarks / Notes:', margin, y - 4);
  doc.setLineWidth(0.35);
  doc.rect(margin, y - 1, contentW, 22);
  y += 32;

  // Signatures
  const sigW = contentW / 2 - 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.line(margin, y, margin + sigW, y);
  doc.line(pageW - margin - sigW, y, pageW - margin, y);
  doc.text('Store Manager (Name, Signature & Date)', margin, y + 5);
  doc.text('Administrator (Name, Signature & Date)', pageW - margin - sigW, y + 5);

  // Verification QR
  const qr = await buildDocumentQr();
  drawQrBlock(doc, qr, pageW - margin - 20, y + 10, 20, 'Scan to verify this report');

  doc.setDrawColor(0, 0, 0);
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

  doc.save(`Purchase-Report-${(reportDate || 'blank').replace(/[^\w-]/g, '')}.pdf`);
  try {
    const blobUrl = doc.output('bloburl') as unknown as string;
    const printWin = window.open(blobUrl, '_blank');
    if (printWin) {
      printWin.addEventListener('load', () => {
        try { printWin.focus(); printWin.print(); } catch {}
      });
    }
  } catch {}
};

const PurchaseReportTemplateDownload = () => {
  const [open, setOpen] = useState(false);
  const [reportDate, setReportDate] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [busy, setBusy] = useState(false);

  const handleGenerate = async () => {
    try {
      setBusy(true);
      await generatePurchaseReport(reportDate.trim(), warehouse.trim());
      setOpen(false);
      toast({ title: 'Purchase report template ready', description: 'PDF downloaded and print preview opened.' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'Failed to generate template.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="border-2 border-primary/20 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Warehouse className="h-5 w-5 text-primary" />
            Purchase Report Template (Blank)
          </CardTitle>
          <CardDescription className="text-xs">
            Portrait A4 single-day stock report — Arabica and Robusta totals only, with opening stock, coffee
            bought, sold, bags, closing stock, rejected coffee, unbought / pending, and signature lines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setOpen(true)} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Download PDF for Printing
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Purchase Report Template</DialogTitle>
            <DialogDescription>
              Enter the report date and warehouse manually, or leave them blank to fill in by hand after printing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pr-date">Report Date (typed manually)</Label>
              <Input
                id="pr-date"
                placeholder="e.g. 07 / 08 / 2026"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-warehouse">Warehouse / Store</Label>
              <Input
                id="pr-warehouse"
                placeholder="e.g. Main Store - Kasese"
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Generate &amp; Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PurchaseReportTemplateDownload;