import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, ClipboardCheck } from 'lucide-react';
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

  let logoData: string | null = null;
  try { logoData = await loadImageAsBase64(LOGO_URL); } catch {}

  // Header
  if (logoData) {
    try { doc.addImage(logoData, 'PNG', margin, 8, 28, 28); } catch {}
  }

  doc.setTextColor(13, 61, 31);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GREAT PEARL COFFEE FACTORY', margin + 34, 16);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Kasese, Uganda', margin + 34, 22);
  doc.text('+256 781 121 639  |  info@greatpearlcoffee.com', margin + 34, 27);
  doc.text('www.greatpearlcoffee.com', margin + 34, 32);

  // separator
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(margin, 40, pageW - margin, 40);

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('QUALITY ANALYSIS FORM', pageW / 2, 50, { align: 'center' });

  // Table
  let y = 56;
  const labelW = contentW * 0.42;
  const valueW = contentW - labelW;
  const rowH = Math.min(13, (pageH - y - 30) / ROWS.length);

  doc.setLineWidth(0.4);
  doc.setDrawColor(0, 0, 0);

  ROWS.forEach((r) => {
    doc.rect(margin, y, labelW, rowH);
    doc.rect(margin + labelW, y, valueW, rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text(r.label, margin + 3, y + rowH / 2 + 1);
    if (r.hint) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(140, 140, 140);
      doc.text(r.hint, margin + labelW + 4, y + rowH / 2 + 1);
    }
    y += rowH;
  });

  // Footer note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text(
    'Great Agro Coffee Ltd  |  A Member of YEDA Coffee Company Limited  |  P.O Box 431420, Kasese, Uganda',
    pageW / 2,
    pageH - 10,
    { align: 'center' },
  );

  const blobUrl = doc.output('bloburl');
  const printWin = window.open(blobUrl as unknown as string, '_blank');
  if (printWin) {
    printWin.addEventListener('load', () => {
      try { printWin.focus(); printWin.print(); } catch {}
    });
  }
  doc.save('Quality-Analysis-Form-Blank.pdf');
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
          <Printer className="h-4 w-4" />
          Print Blank Form
        </Button>
      </CardContent>
    </Card>
  );
};

export default QualityAnalysisFormDownload;