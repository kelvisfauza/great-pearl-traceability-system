import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Download, Truck, Loader2, Plus, Trash2 } from 'lucide-react';
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

interface TruckRow {
  truck_number: string;
  bags_loaded: string;
  store_weight: string;
  lot_refs: string;
  traceability_confirmed: boolean;
  quality_report_attached: boolean;
  buyer_weight: string;
  receipt_attached: boolean;
}

interface FormValues {
  dispatch_date: string;
  warehouse: string;
  coffee_type: string;
  destination_buyer: string;
  vehicle_registrations: string;
  total_weight_store: string;
  traceability_confirmed: boolean;
  quality_analysis_attached: boolean;
  buyer_weight: string;
  receipt_attached: boolean;
  remarks: string;
  inputted_by: string;
  manager_name: string;
  trucks: TruckRow[];
}

const emptyTruck = (): TruckRow => ({
  truck_number: '',
  bags_loaded: '',
  store_weight: '',
  lot_refs: '',
  traceability_confirmed: false,
  quality_report_attached: false,
  buyer_weight: '',
  receipt_attached: false,
});

export const BLANK_MANUAL_VALUES: FormValues = {
  dispatch_date: '',
  warehouse: '',
  coffee_type: '',
  destination_buyer: '',
  vehicle_registrations: '',
  total_weight_store: '',
  traceability_confirmed: false,
  quality_analysis_attached: false,
  buyer_weight: '',
  receipt_attached: false,
  remarks: '',
  inputted_by: '',
  manager_name: '',
  trucks: Array.from({ length: 6 }, emptyTruck),
};

const num = (v: string) => {
  const n = parseFloat(String(v || '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number) => (n ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '');

const line = (doc: jsPDF, x1: number, y: number, x2: number) => doc.line(x1, y, x2, y);

export const generateDispatchMonitoringForm = async (formNumber: string, v: FormValues) => {
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

  const tick = (x: number, yy: number, checked: boolean) => {
    doc.rect(x, yy, 4, 4);
    if (checked) {
      doc.setLineWidth(0.6);
      doc.line(x + 0.8, yy + 2, x + 1.7, yy + 3.2);
      doc.line(x + 1.7, yy + 3.2, x + 3.3, yy + 0.9);
      doc.setLineWidth(0.35);
    }
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
  cell('TOTAL WEIGHED AT STORE (KGS)', v.total_weight_store, margin + half, half, y);
  y += rowH;

  // Checks row
  doc.rect(margin, y, contentW, rowH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.text('TRACEABILITY CHECKED:', margin + 2, y + 5.5);
  tick(margin + 42, y + 2.4, v.traceability_confirmed);
  doc.setFont('helvetica', 'normal');
  doc.text('YES', margin + 47.5, y + 5.5);
  tick(margin + 56, y + 2.4, !v.traceability_confirmed);
  doc.text('NO', margin + 61.5, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.text('QUALITY ANALYSIS ATTACHED:', margin + 74, y + 5.5);
  tick(margin + 125, y + 2.4, v.quality_analysis_attached);
  doc.setFont('helvetica', 'normal');
  doc.text('YES', margin + 130.5, y + 5.5);
  tick(margin + 139, y + 2.4, !v.quality_analysis_attached);
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
  doc.text('B.  TRUCK DETAILS  (one line per truck loaded)', margin + 2, y + 4.2);
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
  doc.setFontSize(7.6);
  const truckRows = Math.max(v.trucks.length, 3);
  for (let r = 0; r < truckRows; r++) {
    const t = v.trucks[r];
    const vals = t
      ? [t.truck_number, t.bags_loaded, t.store_weight, t.lot_refs, t.traceability_confirmed ? 'Y' : 'N', t.quality_report_attached ? 'Y' : 'N']
      : ['', '', '', '', '', ''];
    x = margin;
    truckCols.forEach((c, ci) => {
      const cw = contentW * c.w;
      doc.rect(x, y, cw, 10);
      const text = String(vals[ci] || '');
      if (text) doc.text(doc.splitTextToSize(text, cw - 3)[0], x + cw / 2, y + 6.2, { align: 'center' });
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
  doc.setFont('helvetica', 'bold');
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
  doc.setFontSize(7.6);
  for (let r = 0; r < truckRows; r++) {
    const t = v.trucks[r];
    const diff = t ? num(t.buyer_weight) - num(t.store_weight) : 0;
    const vals = t
      ? [t.truck_number, t.store_weight, t.buyer_weight, t.buyer_weight ? fmt(diff) : '', t.receipt_attached ? 'Y' : 'N']
      : ['', '', '', '', ''];
    x = margin;
    buyerCols.forEach((c, ci) => {
      const cw = contentW * c.w;
      doc.rect(x, y, cw, 10);
      const text = String(vals[ci] || '');
      if (text) doc.text(doc.splitTextToSize(text, cw - 3)[0], x + cw / 2, y + 6.2, { align: 'center' });
      x += cw;
    });
    y += 10;
  }

  // Totals row
  const totalStore = v.trucks.reduce((s, t) => s + num(t.store_weight), 0) || num(v.total_weight_store);
  const totalBuyer = v.trucks.reduce((s, t) => s + num(t.buyer_weight), 0) || num(v.buyer_weight);
  x = margin;
  doc.setFont('helvetica', 'bold');
  const totalVals = ['TOTAL', fmt(totalStore), fmt(totalBuyer), fmt(totalBuyer - totalStore), v.receipt_attached ? 'Y' : ''];
  buyerCols.forEach((c, ci) => {
    const cw = contentW * c.w;
    doc.rect(x, y, cw, 8);
    if (totalVals[ci]) doc.text(String(totalVals[ci]), x + cw / 2, y + 5.3, { align: 'center' });
    x += cw;
  });
  y += 8 + 5;

  // --- Remarks ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('REMARKS / OBSERVATIONS', margin, y);
  doc.rect(margin, y + 1.5, contentW, 20);
  if (v.remarks) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(v.remarks, contentW - 4).slice(0, 5), margin + 2, y + 6);
  }
  y += 27;

  // --- Signatures ---
  const sigW = contentW / 2 - 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  if (v.inputted_by) doc.text(v.inputted_by, margin, y - 1.5);
  if (v.manager_name) doc.text(v.manager_name, pageW - margin - sigW, y - 1.5);
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
  const [values, setValues] = useState<FormValues>({
    dispatch_date: '',
    warehouse: '',
    coffee_type: '',
    destination_buyer: '',
    vehicle_registrations: '',
    total_weight_store: '',
    traceability_confirmed: false,
    quality_analysis_attached: false,
    buyer_weight: '',
    receipt_attached: false,
    remarks: '',
    inputted_by: '',
    manager_name: '',
    trucks: [emptyTruck()],
  });

  const totalStore = values.trucks.reduce((s, t) => s + num(t.store_weight), 0) || num(values.total_weight_store);
  const totalBuyer = values.trucks.reduce((s, t) => s + num(t.buyer_weight), 0) || num(values.buyer_weight);
  const difference = totalBuyer - totalStore;

  const handleGenerate = async () => {
    try {
      setBusy(true);

      const { data: numberData, error: numberError } = await (supabase as any)
        .rpc('next_dispatch_monitoring_form_number');
      if (numberError) throw numberError;
      const formNumber = String(numberData);

      const cleanTrucks = values.trucks.filter((t) => t.truck_number || t.store_weight || t.buyer_weight);

      const { error: insertError } = await (supabase as any)
        .from('dispatch_monitoring_forms')
        .insert({
          form_number: formNumber,
          dispatch_date: values.dispatch_date || null,
          warehouse: values.warehouse || null,
          coffee_type: values.coffee_type || null,
          destination_buyer: values.destination_buyer || null,
          vehicle_registrations: values.vehicle_registrations || null,
          total_weight_store: totalStore || null,
          traceability_confirmed: values.traceability_confirmed,
          quality_analysis_attached: values.quality_analysis_attached,
          trucks: cleanTrucks.map((t) => ({
            truck_number: t.truck_number,
            total_bags_loaded: num(t.bags_loaded),
            total_weight_store: num(t.store_weight),
            lot_batch_references: t.lot_refs,
            traceability_confirmed: t.traceability_confirmed,
            quality_report_attached: t.quality_report_attached,
            buyer_weight: num(t.buyer_weight),
            receipt_attached: t.receipt_attached,
          })),
          buyer_weight: totalBuyer || null,
          receipt_attached: values.receipt_attached,
          weight_difference: totalBuyer ? difference : null,
          remarks: values.remarks || null,
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

  const set = (k: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((prev) => ({ ...prev, [k]: e.target.value }));

  const setTruck = (i: number, k: keyof TruckRow, val: string | boolean) =>
    setValues((prev) => ({
      ...prev,
      trucks: prev.trucks.map((t, idx) => (idx === i ? { ...t, [k]: val } : t)),
    }));

  return (
    <>
      <Card className="border-2 border-primary/20 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-5 w-5 text-primary" />
            Dispatch Monitoring Form
          </CardTitle>
          <CardDescription className="text-xs">
            Fill the whole dispatch record in the app — date, warehouse, coffee type, destination/buyer, vehicles,
            store weight, traceability and quality-analysis checks, every truck, buyer weighed kgs, receipts, weight
            difference, remarks and signatures — then print the completed A4 form. Each form carries a unique QR code
            that loads it straight into the EUDR dispatch comparison report.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setOpen(true)} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Fill Form &amp; Print
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispatch Monitoring Form</DialogTitle>
            <DialogDescription>
              Fill in everything you have. Anything left blank simply prints as an empty field to complete by hand.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Section A */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">A. Dispatch details</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="dm-date">Date</Label>
                  <Input id="dm-date" type="date" value={values.dispatch_date} onChange={set('dispatch_date')} />
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
                <div className="space-y-1.5">
                  <Label htmlFor="dm-store-weight">Total Weighed at Store (Kg)</Label>
                  <Input
                    id="dm-store-weight"
                    inputMode="decimal"
                    placeholder="auto-summed from trucks if left blank"
                    value={values.total_weight_store}
                    onChange={set('total_weight_store')}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={values.traceability_confirmed}
                    onCheckedChange={(c) => setValues((p) => ({ ...p, traceability_confirmed: !!c }))}
                  />
                  Traceability checked
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={values.quality_analysis_attached}
                    onCheckedChange={(c) => setValues((p) => ({ ...p, quality_analysis_attached: !!c }))}
                  />
                  Quality analysis attached
                </label>
              </div>
            </div>

            {/* Section B/C: trucks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">B &amp; C. Trucks and buyer weighing</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => setValues((p) => ({ ...p, trucks: [...p.trucks, emptyTruck()] }))}
                >
                  <Plus className="h-3.5 w-3.5" /> Add truck
                </Button>
              </div>

              {values.trucks.map((t, i) => {
                const diff = num(t.buyer_weight) - num(t.store_weight);
                return (
                  <div key={i} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Truck {i + 1}</p>
                      {values.trucks.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setValues((p) => ({ ...p, trucks: p.trucks.filter((_, idx) => idx !== i) }))}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Truck / Plate No.</Label>
                        <Input value={t.truck_number} onChange={(e) => setTruck(i, 'truck_number', e.target.value)} placeholder="UBK 123A" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Bags loaded</Label>
                        <Input inputMode="numeric" value={t.bags_loaded} onChange={(e) => setTruck(i, 'bags_loaded', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Store weight (Kg)</Label>
                        <Input inputMode="decimal" value={t.store_weight} onChange={(e) => setTruck(i, 'store_weight', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Lot / Batch ref(s)</Label>
                        <Input value={t.lot_refs} onChange={(e) => setTruck(i, 'lot_refs', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Buyer weighed (Kg)</Label>
                        <Input inputMode="decimal" value={t.buyer_weight} onChange={(e) => setTruck(i, 'buyer_weight', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Weight difference (Kg)</Label>
                        <Input readOnly value={t.buyer_weight ? fmt(diff) : ''} className="bg-muted" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-5">
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox checked={t.traceability_confirmed} onCheckedChange={(c) => setTruck(i, 'traceability_confirmed', !!c)} />
                        Traceability confirmed
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox checked={t.quality_report_attached} onCheckedChange={(c) => setTruck(i, 'quality_report_attached', !!c)} />
                        Quality report attached
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox checked={t.receipt_attached} onCheckedChange={(c) => setTruck(i, 'receipt_attached', !!c)} />
                        Receipt attached
                      </label>
                    </div>
                  </div>
                );
              })}

              <div className="grid gap-3 sm:grid-cols-3 rounded-md bg-muted/50 p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Total store weight</p>
                  <p className="font-semibold">{fmt(totalStore) || '—'} Kg</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total buyer weighed</p>
                  <p className="font-semibold">{fmt(totalBuyer) || '—'} Kg</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Weight difference</p>
                  <p className={`font-semibold ${difference < 0 ? 'text-destructive' : ''}`}>
                    {totalBuyer ? `${fmt(difference) || '0'} Kg` : '—'}
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={values.receipt_attached}
                  onCheckedChange={(c) => setValues((p) => ({ ...p, receipt_attached: !!c }))}
                />
                Buyer receipt attached to this form
              </label>
            </div>

            {/* Remarks & signatures */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="dm-remarks">Remarks / observations</Label>
                <Textarea id="dm-remarks" rows={3} value={values.remarks} onChange={set('remarks')} maxLength={600} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="dm-inputter">Inputted by</Label>
                  <Input id="dm-inputter" placeholder={employee?.name || 'Name'} value={values.inputted_by} onChange={set('inputted_by')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dm-manager">Manager</Label>
                  <Input id="dm-manager" placeholder="Manager name" value={values.manager_name} onChange={set('manager_name')} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Save &amp; Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DispatchMonitoringTemplateDownload;
