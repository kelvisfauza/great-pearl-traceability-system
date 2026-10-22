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
import { supabase } from '@/integrations/supabase/client';
import { buildDocumentQr, drawQrBlock } from '@/utils/pdfQrCode';

const LOGO_URL = '/lovable-uploads/great-agro-coffee-logo.png';

const loadImageAsBase64 = (url: string): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d')!.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/png'));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

const generateStoreForms = async (numbers: string[]) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210, pageH = 297, m = 14, W = pageW - m * 2;
  const logo = await loadImageAsBase64(LOGO_URL);

  const cell = (x: number, y: number, w: number, h: number, label?: string, shade = false) => {
    if (shade) { doc.setFillColor(235, 235, 235); doc.rect(x, y, w, h, 'F'); }
    doc.rect(x, y, w, h);
    if (label) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      doc.text(label, x + 2, y + 4.8);
    }
  };

  const drawPage = (formNo: string, qr: Awaited<ReturnType<typeof buildDocumentQr>>) => {
    doc.setTextColor(0, 0, 0); doc.setDrawColor(0, 0, 0);
    if (logo) { try { doc.addImage(logo, 'PNG', m, 6, 20, 20); } catch {} }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.text('GREAT AGRO COFFEE', m + 25, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text('a member of YEDA COFFEE COMPANY LIMITED', m + 25, 17);
    doc.text('P.O Box 431420, Kasese, Uganda  |  +256 393 001 626 / +256 393 101 103', m + 25, 21.5);
    doc.text('info@greatpearlcoffee.com  |  www.greatpearlcoffee.com', m + 25, 26);
    drawQrBlock(doc, qr, pageW - m - 22, 5, 22, 'Scan to verify');
    doc.setLineWidth(0.5); doc.line(m, 33, pageW - m, 33);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('STORE DAILY REPORT & STOCK CONTROL', pageW / 2, 41, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Form No: ${formNo}`, pageW - m, 41, { align: 'right' });
    doc.setLineWidth(0.35);

    // Header block
    let y = 46; const h = 10; const half = W / 2;
    cell(m, y, half, h, 'Date:'); cell(m + half, y, half, h);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text('Coffee Type:   [  ] Robusta    [  ] Drugar    [  ] Arabica    [  ] Other', m + half + 2, y + 6.3);
    y += h;
    cell(m, y, half, h, 'Store:'); cell(m + half, y, half, h, 'Store Manager:');
    y += h + 4;

    // Opening / purchases
    const q = W / 4;
    ['OPENING BALANCE (KGS)', 'OPENING BAGS', 'DAILY PURCHASE (KGS)', 'DAILY PURCHASE (BAGS)'].forEach((l, i) => cell(m + q * i, y, q, 8, l, true));
    y += 8; for (let i = 0; i < 4; i++) cell(m + q * i, y, q, 12);
    y += 16;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('Total Kgs Unbought (Rejected / Pending): ______________________________', m, y);
    y += 6;

    // Sales
    const c1 = W * 0.5, c2 = W * 0.25;
    cell(m, y, c1, 8, 'BUYER / DESTINATION', true); cell(m + c1, y, c2, 8, 'KGS SOLD', true); cell(m + c1 + c2, y, c2, 8, 'BAGS SOLD', true);
    y += 8;
    for (let r = 0; r < 3; r++) { cell(m, y, c1, 10); cell(m + c1, y, c2, 10); cell(m + c1 + c2, y, c2, 10); y += 10; }
    y += 5;

    // Calculation
    const l = W * 0.6;
    cell(m, y, l, 8, 'CALCULATION SUMMARY', true); cell(m + l, y, W - l, 8, 'KGS', true); y += 8;
    ['Opening Balance', '+ Daily Purchases', '= Total Available', '- Total Sales', 'CLOSING BALANCE'].forEach((t) => {
      doc.rect(m, y, l, 9); doc.rect(m + l, y, W - l, 9);
      doc.setFont('helvetica', t === 'CLOSING BALANCE' ? 'bold' : 'normal'); doc.setFontSize(9);
      doc.text(t, m + 2, y + 6); y += 9;
    });
    y += 5;

    // Coffee left
    cell(m, y, l, 8, 'COFFEE LEFT IN STORE (KGS)', true); cell(m + l, y, W - l, 8, 'BAGS IN STORE', true); y += 8;
    cell(m, y, l, 12); cell(m + l, y, W - l, 12); y += 17;

    // Signatures
    const t = W / 3;
    ['Store Manager Sign & Stamp', 'Date', 'Management Verification'].forEach((lb, i) => cell(m + t * i, y, t, 8, lb, true));
    y += 8; for (let i = 0; i < 3; i++) cell(m + t * i, y, t, 24);

    doc.setLineWidth(0.5); doc.line(m, pageH - 16, pageW - m, pageH - 16);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
    doc.text('Great Agro Coffee  |  a member of YEDA Coffee Company Limited  |  P.O Box 431420, Kasese, Uganda  |  www.greatpearlcoffee.com',
      pageW / 2, pageH - 10, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  };

  for (let i = 0; i < numbers.length; i++) {
    if (i > 0) doc.addPage();
    const qr = await buildDocumentQr(numbers[i].replace(/\s+/g, '-'));
    drawPage(numbers[i], qr);
  }
  const first = numbers[0], last = numbers[numbers.length - 1];
  await doc.save((numbers.length > 1 ? `Store-Daily-Reports-${first}-to-${last}.pdf` : `Store-Daily-Report-${first}.pdf`).replace(/\s/g, ''));
  try {
    const w = window.open(doc.output('bloburl') as unknown as string, '_blank');
    w?.addEventListener('load', () => { try { w.focus(); w.print(); } catch {} });
  } catch {}
};

const StoreDailyReportFormDownload = () => {
  const [open, setOpen] = useState(false);
  const [copies, setCopies] = useState(1);
  const [busy, setBusy] = useState(false);

  const handleGenerate = async () => {
    const count = Math.max(1, Math.min(100, Number(copies) || 1));
    try {
      setBusy(true);
      const { data, error } = await (supabase as any).rpc('issue_store_report_form_numbers', { p_count: count, p_issued_by_name: null });
      if (error) throw error;
      const numbers: string[] = data || [];
      if (!numbers.length) throw new Error('No form numbers were issued');
      await generateStoreForms(numbers);
      setOpen(false);
      toast({ title: `${numbers.length} form(s) ready`, description: `Form numbers ${numbers[0]}${numbers.length > 1 ? ` → ${numbers[numbers.length - 1]}` : ''} issued.` });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'Failed to generate forms.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <>
      <Card className="border-2 border-primary/20 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Warehouse className="h-5 w-5 text-primary" />
            Store Daily Report & Stock Control
          </CardTitle>
          <CardDescription className="text-xs">
            Print numbered store report sheets with the company header and a verification QR code on each.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setOpen(true)} className="w-full gap-2">
            <Download className="h-4 w-4" /> Print Store Report Forms
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Store Daily Report Forms</DialogTitle>
            <DialogDescription>Numbers (GAC SR 0001) are issued by the system and restart each month.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sr-copies">How many forms to print? (1 - 100)</Label>
            <Input id="sr-copies" type="number" min={1} max={100} value={copies} onChange={(e) => setCopies(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Each form gets its own number and QR code.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Generate & Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StoreDailyReportFormDownload;
