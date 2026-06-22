import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, PageOrientation, Footer,
} from 'docx';
import {
  createLetterheadHeader,
  createLetterheadRegLine,
  createLetterheadFooter,
  fetchLogoBytes,
  letterheadSpacer,
  noBorder,
  noBorders,
} from '@/utils/docxLetterhead';



const generateDocx = async (employee: any) => {
  const logoBytes = await fetchLogoBytes();
  const now = new Date();
  const refNo = `DOC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const today = `${now.getDate()}${['th','st','nd','rd'][((now.getDate()%100)>10&&(now.getDate()%100)<14)?0:[0,1,2,3][now.getDate()%10]||0]} ${now.toLocaleString('en-US',{month:'long'})} ${now.getFullYear()}`;

  // TOP HEADER (Stanbic-style): logo on LEFT, company name + tagline beside it, single bottom rule
  const headerTable = createLetterheadHeader(logoBytes);

  // Registration line directly under the header rule (no incorporation date in the header)
  const regLine = createLetterheadRegLine(false);

  // Ref / Date block as a borderless 2-col table
  const refCell = (label: string, value: string) => new TableRow({
    children: [
      new TableCell({
        width: { size: 1400, type: WidthType.DXA },
        borders: noBorders,
        margins: { top: 40, bottom: 40, left: 0, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
      }),
      new TableCell({
        width: { size: 7960, type: WidthType.DXA },
        borders: noBorders,
        margins: { top: 40, bottom: 40, left: 0, right: 0 },
        children: [new Paragraph({ children: [new TextRun({ text: value, size: 20 })] })],
      }),
    ],
  });

  const refTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1400, 7960],
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [
      refCell('Our Ref:', refNo),
      refCell('Your Ref:', '________________________'),
      refCell('Date:', today),
    ],
  });

  // FOOTER: thin top border + 4 columns + registration line
  const footerTableFixed = createLetterheadFooter(true);


  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 20 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      footers: {
        default: new Footer({ children: [footerTableFixed] }),
      },
      children: [
        headerTable,
        regLine,
        letterheadSpacer(200),
        refTable,
        letterheadSpacer(300),
        // Blank body — users type whatever they want
        ...Array.from({ length: 24 }, () => new Paragraph({ children: [new TextRun({ text: '' })] })),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Company-Letterhead-${refNo}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const CompanyHeaderSheetDownload = () => {
  const { employee } = useAuth();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!employee) {
      toast({ title: 'Not signed in', description: 'Please sign in to download', variant: 'destructive' });
      return;
    }
    setDownloading(true);
    try {
      await generateDocx(employee);
      toast({ title: 'Downloaded', description: 'Company header sheet downloaded successfully.' });
    } catch (err) {
      console.error('DOCX generation error:', err);
      toast({ title: 'Error', description: 'Failed to generate document.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5 text-primary" />
          Company Header Sheet (Word)
        </CardTitle>
        <CardDescription className="text-xs">
          Download an editable Word document pre-filled with the company header, logo and your details (name, title, department).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleDownload} disabled={downloading} className="w-full gap-2">
          <Download className="h-4 w-4" />
          {downloading ? 'Generating...' : 'Download Word (.docx)'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CompanyHeaderSheetDownload;