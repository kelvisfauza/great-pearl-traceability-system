import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, HeightRule, PageOrientation,
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
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

const labelCell = (text: string, width: number) =>
  new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders,
    shading: { fill: 'F2F2F2', type: ShadingType.CLEAR, color: 'auto' },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, color: '333333' })] })],
  });

const valueCell = (text: string, width: number) =>
  new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text: text || ' ', size: 20 })] })],
  });

const blankLineRow = (label: string) =>
  new TableRow({
    height: { value: 600, rule: HeightRule.ATLEAST },
    children: [
      new TableCell({
        width: { size: 9360, type: WidthType.DXA },
        borders: cellBorders,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
      }),
    ],
  });

const generateDocx = async (employee: any) => {
  const logoBytes = await fetchLogoBytes();
  const now = new Date();
  const refNo = `DOC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Header: logo + company info side by side
  const headerRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 1800, type: WidthType.DXA },
        borders: noBorders,
        verticalAlign: 'center' as any,
        shading: { fill: '0D3D1F', type: ShadingType.CLEAR, color: 'auto' },
        margins: { top: 120, bottom: 120, left: 120, right: 120 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: logoBytes
              ? [new ImageRun({
                  type: 'png',
                  data: logoBytes,
                  transformation: { width: 70, height: 70 },
                  altText: { title: 'Logo', description: 'Great Agro Coffee Logo', name: 'logo' },
                })]
              : [new TextRun({ text: 'GAC', bold: true, color: 'FFFFFF', size: 32 })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 7560, type: WidthType.DXA },
        borders: noBorders,
        verticalAlign: 'center' as any,
        shading: { fill: '0D3D1F', type: ShadingType.CLEAR, color: 'auto' },
        margins: { top: 120, bottom: 120, left: 200, right: 120 },
        children: [
          new Paragraph({ children: [new TextRun({ text: 'GREAT AGRO COFFEE LTD', bold: true, size: 36, color: 'FFFFFF' })] }),
          new Paragraph({ children: [new TextRun({ text: 'Kasese, Uganda', size: 20, color: 'F2F2F2' })] }),
          new Paragraph({ children: [new TextRun({ text: 'Tel: +256 393 001 626  |  info@greatpearlcoffee.com', size: 18, color: 'F2F2F2' })] }),
          new Paragraph({ children: [new TextRun({ text: 'www.greatagrocoffee.com  |  UCDA Licensed', size: 18, color: 'F2F2F2' })] }),
        ],
      }),
    ],
  });

  const headerTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1800, 7560],
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [headerRow],
  });

  const spacer = (size = 100) => new Paragraph({ spacing: { before: 0, after: size }, children: [new TextRun({ text: '' })] });

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
      children: [
        headerTable,
        spacer(300),
        // Blank body — users type whatever they want
        ...Array.from({ length: 28 }, () => new Paragraph({ children: [new TextRun({ text: '' })] })),
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