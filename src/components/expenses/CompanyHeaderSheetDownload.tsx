import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, PageOrientation, Footer,
} from 'docx';

const LOGO_URL = '/lovable-uploads/great-agro-coffee-logo.png';

const fetchLogoBytes = async (): Promise<Uint8Array | null> => {
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
};

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

const thinBlack = { style: BorderStyle.SINGLE, size: 6, color: '000000' };

const generateDocx = async (employee: any) => {
  const logoBytes = await fetchLogoBytes();
  const now = new Date();
  const refNo = `DOC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const today = `${now.getDate()}${['th','st','nd','rd'][((now.getDate()%100)>10&&(now.getDate()%100)<14)?0:[0,1,2,3][now.getDate()%10]||0]} ${now.toLocaleString('en-US',{month:'long'})} ${now.getFullYear()}`;

  // TOP HEADER: company name (right) + logo (far right), with bottom border
  const headerRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 8460, type: WidthType.DXA },
        borders: { ...noBorders, bottom: thinBlack },
        verticalAlign: 'center' as any,
        margins: { top: 120, bottom: 200, left: 0, right: 200 },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'GREAT AGRO COFFEE LTD', bold: true, size: 32, font: 'Arial' }),
              new TextRun({ text: '\nUnder Hello YEDA Coffee Company Limited', bold: true, size: 20, font: 'Arial', color: '1a5632' }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 900, type: WidthType.DXA },
        borders: { ...noBorders, bottom: thinBlack, left: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
        verticalAlign: 'center' as any,
        margins: { top: 80, bottom: 80, left: 120, right: 80 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: logoBytes
              ? [new ImageRun({
                  type: 'png',
                  data: logoBytes,
                  transformation: { width: 60, height: 60 },
                  altText: { title: 'Logo', description: 'GAC Logo', name: 'logo' },
                })]
              : [new TextRun({ text: 'GAC', bold: true, size: 28 })],
          }),
        ],
      }),
    ],
  });

  const headerTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [8460, 900],
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [headerRow],
  });

  const spacer = (size = 100) => new Paragraph({ spacing: { before: 0, after: size }, children: [new TextRun({ text: '' })] });

  // Contact block (left aligned, under header)
  const contactLines = [
    'P.O Box 431420, Kasese, Uganda',
    '0393001626',
    'operations@greatpearlcoffee.com',
    'www.greatpearlcoffee.com',
  ].map(t => new Paragraph({ children: [new TextRun({ text: t, size: 20 })], spacing: { after: 40 } }));

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

  // FOOTER: thin top border + 4 columns
  const footCell = (heading: string, value: string, align: any = AlignmentType.LEFT) => new TableCell({
    width: { size: 2340, type: WidthType.DXA },
    borders: { ...noBorders, top: thinBlack },
    margins: { top: 120, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({ alignment: align, children: [new TextRun({ text: heading, bold: true, size: 18 })] }),
      new Paragraph({ alignment: align, children: [new TextRun({ text: value, size: 18 })] }),
    ],
  });

  const footerTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2340, 2340, 2340, 2340],
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 2340, type: WidthType.DXA },
          borders: { ...noBorders, top: thinBlack },
          margins: { top: 120, bottom: 60, left: 0, right: 80 },
          children: [
            new Paragraph({ children: [new TextRun({ text: 'Great Agro Coffee Ltd', bold: true, size: 18 })] }),
            new Paragraph({ children: [new TextRun({ text: 'P.O Box 431420, Kasese, Uganda', size: 18 })] }),
          ],
        }),
        footCell('Telephone', '0393001626'),
        footCell('Email', 'operations@greatpearlcoffee.com'),
        footCell('Website', 'www.greatpearlcoffee.com'),
      ],
    })],
  });

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
        default: new Footer({ children: [footerTable] }),
      },
      children: [
        headerTable,
        spacer(200),
        ...contactLines,
        spacer(200),
        refTable,
        spacer(300),
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