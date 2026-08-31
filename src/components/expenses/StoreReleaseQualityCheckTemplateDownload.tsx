import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlaskConical, Download, Loader2 } from 'lucide-react';
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

export const generateStoreReleaseQualityCheckForm = async () => {
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
  doc.text('QUALITY CHECK — STORE RELEASE ATTACHMENT', pageW / 2, 32.5, { align: 'center' });
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

  // Link to the store clearance / dispatch record
  cell('DATE', margin, half, y);
  cell('STORE DISPATCH NO. (e.g. GAC-DM-2608-0001)', margin + half, half, y);
  y += rowH;
  cell('ATTACHED TO CLEARANCE FORM NO.', margin, half, y);
  cell('BUYER / DESTINATION', margin + half, half, y);
  y += rowH;
  cell('WAREHOUSE / STORE', margin, half, y);
  cell('LOT / BATCH REF. ANALYSED', margin + half, half, y);
  y += rowH + 4;

  // Quality parameters table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('QUALITY PARAMETERS', margin, y);
  y += 2;

  const cols = [
    { label: 'Parameter', w: 0.34 },
    { label: 'Standard / Limit', w: 0.26 },
    { label: 'Result', w: 0.40 },
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

  const params = [
    ['Coffee Type', ''],
    ['Moisture (%)', 'Max 13.0%'],
    ['Outturn / Screen', ''],
    ['Defects (count / 300g)', ''],
    ['Foreign Matter', ''],
    ['Cup Score', ''],
    ['Odour / Condition', 'Clean, no off-flavour'],
    ['Grade Assigned', ''],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  params.forEach(([param, standard]) => {
    x = margin;
    cols.forEach((c, ci) => {
      const cw = contentW * c.w;
      doc.rect(x, y, cw, 8.5);
      const text = ci === 0 ? param : ci === 1 ? standard : '';
      if (text) doc.text(text, x + 2, y + 5.6);
      x += cw;
    });
    y += 8.5;
  });
  y += 6;

  // Verdict
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('VERDICT', margin, y);
  y += 2;
  const verdictH = 12;
  doc.rect(margin, y, contentW, verdictH);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('APPROVED FOR RELEASE', margin + 5, y + 7.5);
  doc.rect(margin + 55, y + 3.5, 5, 5);
  doc.text('REJECTED / HOLD', margin + 75, y + 7.5);
  doc.rect(margin + 108, y + 3.5, 5, 5);
  doc.text('CONDITIONS: ______________________________', margin + 125, y + 7.5);
  y += verdictH + 6;

  // Remarks
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('REMARKS', margin, y);
  doc.rect(margin, y + 1.5, contentW, 16);
  y += 24;

  // Signatures
  const sigW = (contentW - 20) / 3;
  const labels = ['Analysed By — Quality Officer', 'Verified By — Quality Manager', 'Received By — Store Manager'];
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

  doc.save('Quality-Check-Store-Release-Form.pdf');
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

const StoreReleaseQualityCheckTemplateDownload = () => {
  const [busy, setBusy] = useState(false);

  const handleGenerate = async () => {
    try {
      setBusy(true);
      await generateStoreReleaseQualityCheckForm();
      toast({
        title: 'Quality check form ready',
        description: 'PDF downloaded and print preview opened — attach it to the store clearance form.',
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
          <FlaskConical className="h-5 w-5 text-primary" />
          Quality Check — Store Release Attachment
        </CardTitle>
        <CardDescription className="text-xs">
          Quality department attachment for coffee leaving the store. References the Store Clearance
          Form No., records parameters (moisture, defects, cup score, grade), a verdict
          (Approved / Rejected / Conditions), remarks, and three signature lines
          (Quality Officer, Quality Manager, Store Manager). Print and attach to the clearance form.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleGenerate} disabled={busy} className="w-full gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download Quality Check Form
        </Button>
      </CardContent>
    </Card>
  );
};

export default StoreReleaseQualityCheckTemplateDownload;
