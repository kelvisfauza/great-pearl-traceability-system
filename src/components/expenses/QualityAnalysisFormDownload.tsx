import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ClipboardCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';

const LOGO_URL = '/lovable-uploads/great-agro-coffee-logo.png';
const BRAND: [number, number, number] = [123, 63, 0];
const ACCENT: [number, number, number] = [201, 162, 39];

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

const generateBlankQualityForm = async () => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;

  const logoData = await loadImageAsBase64(LOGO_URL);

  // Brand header band (matches salary advance form letterhead)
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 26, 'F');
  doc.setFillColor(...ACCENT);
  doc.rect(0, 26, pageW, 2, 'F');

  if (logoData) {
    try { doc.addImage(logoData, 'PNG', margin, 3, 20, 20); } catch {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('GREAT PEARL COFFEE FACTORY', margin + 24, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('a member of YEDA COFFEE COMPANY LIMITED', margin + 24, 17);
  doc.text('P.O Box 431420, Kasese, Uganda  |  +256 781 121 639  |  info@greatpearlcoffee.com', margin + 24, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('QUALITY', pageW - margin, 12, { align: 'right' });
  doc.text('ANALYSIS FORM', pageW - margin, 17, { align: 'right' });

  // Section title
  doc.setTextColor(...BRAND);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('QUALITY ANALYSIS FORM', pageW / 2, 36, { align: 'center' });

  // Table
  let y = 42;
  const labelW = contentW * 0.42;
  const valueW = contentW - labelW;
  const rowH = Math.min(13, (pageH - y - 24) / ROWS.length);

  doc.setLineWidth(0.4);
  doc.setDrawColor(0, 0, 0);

  ROWS.forEach((r) => {
    doc.setFillColor(248, 244, 235);
    doc.rect(margin, y, labelW, rowH, 'F');
    doc.rect(margin, y, labelW, rowH);
    doc.rect(margin + labelW, y, valueW, rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text(r.label, margin + 3, y + rowH / 2 + 1);
    if (r.hint) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(r.hint, margin + labelW + 4, y + rowH / 2 + 1);
    }
    y += rowH;
  });

  // Footer
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.6);
  doc.line(margin, pageH - 16, pageW - margin, pageH - 16);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text(
    'Great Agro Coffee  |  a member of YEDA Coffee Company Limited  |  P.O Box 431420, Kasese, Uganda  |  www.greatpearlcoffee.com',
    pageW / 2,
    pageH - 10,
    { align: 'center' },
  );

  // Download as PDF (primary action) + open print preview
  doc.save('Quality-Analysis-Form-Blank.pdf');
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
  const handleGenerate = async () => {
    try {
      await generateBlankQualityForm();
      toast({ title: 'Quality Analysis Form ready', description: 'Blank form opened for printing.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to generate form.', variant: 'destructive' });
    }
  };

  return (
    <Card className="border-2 border-primary/20 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Quality Analysis Form (Blank)
        </CardTitle>
        <CardDescription className="text-xs">
          Printable blank quality analysis form with company header. Used by the Quality Department for manual sample assessments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleGenerate} className="w-full gap-2">
          <Download className="h-4 w-4" />
          Download PDF for Printing
        </Button>
      </CardContent>
    </Card>
  );
};

export default QualityAnalysisFormDownload;