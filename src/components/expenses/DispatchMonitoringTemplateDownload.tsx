import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Download, Truck, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { buildPublicUrl } from '@/utils/publicUrl';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

interface HeaderValues {
  dispatch_date: string;
  warehouse: string;
  coffee_type: string;
  destination_buyer: string;
  vehicle_registrations: string;
}

const line = (doc: jsPDF, x1: number, y: number, x2: number) => doc.line(x1, y, x2, y);

const generateDispatchMonitoringForm = async (formNumber: string, v: HeaderValues) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const margin = 10;
  const contentW = pageW - margin * 2;

  const logoData = await loadImageAsBase64(LOGO_URL);
  if (logoData) {
    try { doc.addImage(logoData, 'PNG', margin, 4, 16, 16); } catch { /* ignore */ }
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

  doc.setLineWidth(0.5);
  line(doc, margin, 24, pageW - margin);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('DISPATCH MONITORING FORM', pageW / 2, 30.5, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`Form No: ${formNumber}`, pageW - margin, 30.5, { align: 'right' });

  doc.setLineWidth(0.35);
  let y = 34;

  // --- Section A: Dispatch details ---
  const rowH = 8.5;
  const half = contentW / 2;
  const cell = (label: string, value: string, x: number, w: number, yy: number) => {
    doc.rect(x, yy, w, rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.text(label, x + 2, yy + 3.4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);
    doc.text(value || '', x + 2, yy + 7);
  };

  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, contentW, 6, 'F');
  doc.rect(margin, y, contentW, 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('A.  DISPATCH DETAILS', margin + 2, y + 4.2);
  y += 6;

  cell('DATE', v.dispatch_date, margin, half, y);
  cell('WAREHOUSE / STORE', v.warehouse, margin + half, half, y);
  y += rowH;
  cell('COFFEE TYPE', v.coffee_type, margin, half, y);
  cell('DESTINATION / BUYER', v.destination_buyer, margin + half, half, y);
  y += rowH;
  cell('VEHICLE NUMBER(S)', v.vehicle_registrations, margin, half, y);
  cell('TOTAL WEIGHED AT STORE (KGS)', '', margin + half, half, y);
  y += rowH;

  // Checks row
  doc.rect(margin, y, contentW, rowH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.text('TRACEABILITY CHECKED:', margin + 2, y + 5.5);
  doc.rect(margin + 42, y + 2.4, 4, 4);
  doc.setFont('helvetica', 'normal');
  doc.text('YES', margin + 47.5, y + 5.5);
  doc.rect(margin + 56, y + 2.4, 4, 4);
  doc.text('NO', margin + 61.5, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.text('QUALITY ANALYSIS ATTACHED:', margin + 74, y + 5.5);
  doc.rect(margin + 125, y + 2.4, 4, 4);
  doc.setFont('helvetica', 'normal');
  doc.text('YES', margin + 130.5, y + 5.5);
  doc.rect(margin + 139, y + 2.4, 4, 4);
  doc.text('NO', margin + 144.5, y + 5.5);
  y += rowH;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.6);
  doc.setTextColor(90, 90, 90);
  doc.text('If YES, attach the signed quality analysis sheet to this form before filing.', margin + 2, y + 3.4);
  doc.setTextColor(0, 0, 0);
  y += 6;

  // --- Section B: Trucks ---
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, contentW, 6, 'F');
  doc.rect(margin, y, contentW, 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('B.  TRUCK DETAILS  (complete one line per truck where more than one truck is loaded)', margin + 2, y + 4.2);
  y += 6;

  const truckCols = [
    { label: 'Truck / Plate No.', w: 0.2 },
    { label: 'Bags Loaded', w: 0.13 },
    { label: 'Store Weight (Kg)', w: 0.17 },
    { label: 'Lot / Batch Ref(s)', w: 0.24 },
    { label: 'Traceability\n(Y/N)', w: 0.13 },
    { label: 'Quality Rpt\n(Y/N)', w: 0.13 },
  ];
  const headH = 9;
  let x = margin;
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentW, headH, 'F');
  doc.setFontSize(6.8);
  truckCols.forEach((c) => {
    const cw = contentW * c.w;
    doc.rect(x, y, cw, headH);
    const lines = c.label.split('\n');
    lines.forEach((ln, li) => {
      doc.text(ln, x + cw / 2, y + (lines.length === 1 ? headH / 2 + 1.4 : 3.8 + li * 3.6), { align: 'center' });
    });
    x += cw;
  });
  y += headH;
  doc.setFont('helvetica', 'normal');
  for (let r = 0; r < 4; r++) {
    x = margin;
    truckCols.forEach((c) => {
      const cw = contentW * c.w;
      doc.rect(x, y, cw, 10);
      x += cw;
    });
    y += 10;
  }
  y += 4;

  // --- Section C: Buyer weighing comparison ---
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, contentW, 6, 'F');
  doc.rect(margin, y, contentW, 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('C.  BUYER WEIGHING COMPARISON', margin + 2, y + 4.2);
  y += 6;

  const buyerCols = [
    { label: 'Truck / Plate No.', w: 0.22 },
    { label: 'Store Weight (Kg)', w: 0.19 },
    { label: 'Buyer Weighed (Kg)', w: 0.19 },
    { label: 'Weight Difference (Kg)', w: 0.2 },
    { label: 'Receipt Attached\n(Y/N)', w: 0.2 },
  ];
  x = margin;
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentW, headH, 'F');
  doc.setFontSize(6.8);
  buyerCols.forEach((c) => {
    const cw = contentW * c.w;
    doc.rect(x, y, cw, headH);
    const lines = c.label.split('\n');
    lines.forEach((ln, li) => {
      doc.text(ln, x + cw / 2, y + (lines.length === 1 ? headH / 2 + 1.4 : 3.8 + li * 3.6), { align: 'center' });
    });
    x += cw;
  });
  y += headH;
  doc.setFont('helvetica', 'normal');
  for (let r = 0; r < 4; r++) {
    x = margin;
    buyerCols.forEach((c) => {
      const cw = contentW * c.w;
      doc.rect(x, y, cw, 10);
      x += cw;
    });
    y += 10;
  }
  y += 5;

  // --- Remarks ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('REMARKS / OBSERVATIONS', margin, y);
  doc.rect(margin, y + 1.5, contentW, 20);
  y += 27;

  // --- Signatures ---
  const sigW = contentW / 2 - 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  line(doc, margin, y, margin + sigW);
  line(doc, pageW - margin - sigW, y, pageW - margin);
  doc.text('Inputted By (Name, Signature & Date)', margin, y + 4.5);
  doc.text('Manager (Name, Signature & Date)', pageW - margin - sigW, y + 4.5);

  // --- QR block ---
  const scanUrl = buildPublicUrl(`/verify/${encodeURIComponent(formNumber)}`);
  const qrData = await QRCode.toDataURL(scanUrl, { margin: 0, width: 256, errorCorrectionLevel: 'M' });
  const qrSize = 24;
  const qrX = pageW / 2 - qrSize / 2;
  const qrY = y + 9;
  try { doc.addImage(qrData, 'PNG', qrX, qrY, qrSize, qrSize); } catch { /* ignore */ }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(formNumber, pageW / 2, qrY + qrSize + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(90, 90, 90);
  doc.text('Scan this code in EUDR › New Dispatch Comparison Report to load this form', pageW / 2, qrY + qrSize + 6.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  doc.setLineWidth(0.5);
  line(doc, margin, pageH - 14, pageW - margin);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.4);
  doc.setTextColor(80, 80, 80);
  doc.text(
    'Great Agro Coffee  |  a member of YEDA Coffee Company Limited  |  P.O Box 431420, Kasese, Uganda',
    pageW / 2,
    pageH - 9,
    { align: 'center' },
  );

  doc.save(`Dispatch-Monitoring-${formNumber}.pdf`);
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

const DispatchMonitoringTemplateDownload = () => {
  const { employee } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<HeaderValues>({
    dispatch_date: '',
    warehouse: '',
    coffee_type: '',
    destination_buyer: '',
    vehicle_registrations: '',
  });

  const handleGenerate = async () => {
    try {
      setBusy(true);

      const { data: numberData, error: numberError } = await (supabase as any)
        .rpc('next_dispatch_monitoring_form_number');
      if (numberError) throw numberError;
      const formNumber = String(numberData);

      const { error: insertError } = await (supabase as any)
        .from('dispatch_monitoring_forms')
        .insert({
          form_number: formNumber,
          dispatch_date: values.dispatch_date || null,
          warehouse: values.warehouse || null,
          coffee_type: values.coffee_type || null,
          destination_buyer: values.destination_buyer || null,
          vehicle_registrations: values.vehicle_registrations || null,
          created_by: employee?.email || null,
          created_by_name: employee?.name || null,
          status: 'issued',
        });
      if (insertError) throw insertError;

      await generateDispatchMonitoringForm(formNumber, values);
      setOpen(false);
      toast({
        title: `Dispatch monitoring form ${formNumber} ready`,
        description: 'PDF downloaded. Scan its QR in the EUDR dispatch comparison form to load it.',
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'Failed to generate the form.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof HeaderValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <>
      <Card className="border-2 border-primary/20 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-5 w-5 text-primary" />
            Dispatch Monitoring Form
          </CardTitle>
          <CardDescription className="text-xs">
            Printable A4 dispatch form — date, warehouse, coffee type, destination/buyer, vehicle number, store
            weight, traceability and quality-analysis checks, multiple trucks, buyer weighed kgs, receipt attached,
            weight difference, remarks and inputter/manager signatures. Each form carries a unique QR code that loads
            it straight into the EUDR dispatch comparison report.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setOpen(true)} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Generate Form &amp; Print
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dispatch Monitoring Form</DialogTitle>
            <DialogDescription>
              Pre-fill any details you already know — leave the rest blank to complete by hand after printing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="dm-date">Date</Label>
              <Input id="dm-date" placeholder="e.g. 21 / 08 / 2026" value={values.dispatch_date} onChange={set('dispatch_date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dm-warehouse">Warehouse / Store</Label>
              <Input id="dm-warehouse" placeholder="e.g. Main Store - Kasese" value={values.warehouse} onChange={set('warehouse')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dm-coffee">Coffee Type</Label>
              <Input id="dm-coffee" placeholder="e.g. Robusta / Drugar" value={values.coffee_type} onChange={set('coffee_type')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dm-buyer">Destination / Buyer</Label>
              <Input id="dm-buyer" placeholder="e.g. Kyagalanyi Coffee" value={values.destination_buyer} onChange={set('destination_buyer')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dm-vehicle">Vehicle Number(s)</Label>
              <Input id="dm-vehicle" placeholder="e.g. UBK 123A" value={values.vehicle_registrations} onChange={set('vehicle_registrations')} />
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

export default DispatchMonitoringTemplateDownload;
