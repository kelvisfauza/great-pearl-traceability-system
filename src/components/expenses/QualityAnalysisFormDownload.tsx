import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Download, ClipboardCheck, Loader2 } from 'lucide-react';
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

const ROWS: { label: string; hint?: string }[] = [
  { label: 'Form No.' },
  { label: 'Supplier Name' },
  { label: 'Date' },
  { label: 'Grams Used (Sample Weight)' },
  { label: 'Moisture Content (M.C %)' },
  { label: 'Below 12% (%)' },
  { label: 'Group 1 Defects (%)' },
  { label: 'Group 2 Defects (%)' },
  { label: 'Pods (%)' },
  { label: 'Husks (%)' },
  { label: 'Non-Coffee (%)' },
  { label: 'Outturn (%)' },
  { label: 'Robusta', hint: 'Yes / No' },
  { label: 'Price (UGX per KG)' },
  { label: 'Analysed By' },
  { label: 'Comments' },
];

const generateBlankQualityForm = async (formNumbers: string[]) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;

  const logoData = await loadImageAsBase64(LOGO_URL);

  const drawPage = (formNumber: string, qr: Awaited<ReturnType<typeof buildDocumentQr>>) => {
  // ---- Clean B&W Header (no coloured bands) ----
  if (logoData) {
    try { doc.addImage(logoData, 'PNG', margin, 4, 18, 18); } catch {}
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('GREAT AGRO COFFEE', margin + 24, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('a member of YEDA COFFEE COMPANY LIMITED', margin + 24, 16);
  doc.text('P.O Box 431420, Kasese, Uganda  |  +256 393 001 626 / +256 393 101 103  |  info@greatpearlcoffee.com', margin + 24, 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('QUALITY ANALYSIS FORM', pageW - margin, 14, { align: 'right' });

  // Verification QR (bottom-right, above the footer)
  drawQrBlock(doc, qr, pageW - margin - 20, pageH - 44, 20, 'Scan to verify this form');

  // Thin separator line under header
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, 26, pageW - margin, 26);

  // Section title
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('QUALITY ANALYSIS FORM', pageW / 2, 34, { align: 'center' });

  // Table
  let y = 40;
  const labelW = contentW * 0.42;
  const valueW = contentW - labelW;
  const rowH = Math.min(13, (pageH - y - 24) / ROWS.length);

  doc.setLineWidth(0.35);
  doc.setDrawColor(0, 0, 0);

  ROWS.forEach((r, i) => {
    // Light gray fill for every other row for readability in B&W
    if (i % 2 === 0) {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, contentW, rowH, 'F');
    }
    doc.rect(margin, y, labelW, rowH);
    doc.rect(margin + labelW, y, valueW, rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(r.label, margin + 3, y + rowH / 2 + 1);
    if (r.label === 'Form No.') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(formNumber, margin + labelW + 4, y + rowH / 2 + 1);
    } else if (r.hint) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(r.hint, margin + labelW + 4, y + rowH / 2 + 1);
    }
    y += rowH;
  });

  // Footer separator
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, pageH - 16, pageW - margin, pageH - 16);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(
    'Great Agro Coffee  |  a member of YEDA Coffee Company Limited  |  P.O Box 431420, Kasese, Uganda  |  www.greatpearlcoffee.com',
    pageW / 2,
    pageH - 10,
    { align: 'center' },
  );
  };

  for (let idx = 0; idx < formNumbers.length; idx++) {
    if (idx > 0) doc.addPage();
    const qr = await buildDocumentQr(formNumbers[idx].replace(/\s+/g, '-'));
    drawPage(formNumbers[idx], qr);
  }

  // Download as PDF (primary action) + open print preview
  doc.save(
    formNumbers.length > 1
      ? `Quality-Analysis-Forms-${formNumbers[0]}-to-${formNumbers[formNumbers.length - 1]}.pdf`.replace(/\s/g, '')
      : `Quality-Analysis-Form-${formNumbers[0]}.pdf`.replace(/\s/g, ''),
  );
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

const QualityAnalysisFormDownload = () => {
  const [open, setOpen] = useState(false);
  const [copies, setCopies] = useState(1);
  const [busy, setBusy] = useState(false);

  const handleGenerate = async () => {
    const count = Math.max(1, Math.min(100, Number(copies) || 1));
    try {
      setBusy(true);
      const { data, error } = await (supabase as any).rpc('issue_quality_form_numbers', {
        p_count: count,
        p_issued_by_name: null,
      });
      if (error) throw error;
      const numbers: string[] = (data as string[]) || [];
      if (!numbers.length) throw new Error('No form numbers were issued');
      await generateBlankQualityForm(numbers);
      setOpen(false);
      toast({
        title: `${numbers.length} form(s) ready`,
        description: `Form numbers ${numbers[0]}${numbers.length > 1 ? ` → ${numbers[numbers.length - 1]}` : ''} issued.`,
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'Failed to generate form.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <Card className="border-2 border-primary/20 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Quality Analysis Form (Blank)
        </CardTitle>
        <CardDescription className="text-xs">
          Printable blank quality analysis form with company header and an auto-generated form number
          (GAC QA 0001), which restarts at 0001 at the beginning of every month.
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
          <DialogTitle>How many copies?</DialogTitle>
          <DialogDescription>
            Each copy gets its own unique form number (e.g. GAC QA 0001, GAC QA 0002). Numbering resets
            at the start of each month.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="qa-copies">Number of forms to print (1 - 100)</Label>
          <Input
            id="qa-copies"
            type="number"
            min={1}
            max={100}
            value={copies}
            onChange={(e) => setCopies(Number(e.target.value))}
          />
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

export default QualityAnalysisFormDownload;