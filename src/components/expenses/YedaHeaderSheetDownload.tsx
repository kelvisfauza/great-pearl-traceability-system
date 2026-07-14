import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Document, Packer, Paragraph, TextRun, PageOrientation, Footer,
} from 'docx';
import {
  createYedaHeader,
  createYedaAccentBar,
  createYedaFooter,
  fetchYedaLogoBytes,
  yedaSpacer,
} from '@/utils/docxLetterheadYeda';

const generateDocx = async () => {
  const logoBytes = await fetchYedaLogoBytes();
  const now = new Date();
  const refNo = `YEDA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
          margin: { top: 480, right: 720, bottom: 240, left: 720 },
        },
      },
      footers: {
        default: new Footer({ children: [createYedaFooter()] }),
      },
      children: [
        createYedaHeader(logoBytes),
        createYedaAccentBar(),
        yedaSpacer(400),
        // Blank writing area
        ...Array.from({ length: 26 }, () => new Paragraph({ children: [new TextRun({ text: '' })] })),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `YEDA-Letterhead-${refNo}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const YedaHeaderSheetDownload = () => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await generateDocx();
      toast({ title: 'Downloaded', description: 'YEDA Coffee Company letterhead downloaded.' });
    } catch (err) {
      console.error('YEDA DOCX error:', err);
      toast({ title: 'Error', description: 'Failed to generate document.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="border-2 border-[#0d3d1f]/30 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5" style={{ color: '#0d3d1f' }} />
          YEDA Coffee Company — Official Letterhead
        </CardTitle>
        <CardDescription className="text-xs">
          Editable Word letterhead for the parent company (YEDA Coffee Company Limited) with the official seal, contact block, green &amp; gold accent, and Mission / Vision / Values footer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full gap-2"
          style={{ backgroundColor: '#0d3d1f' }}
        >
          <Download className="h-4 w-4" />
          {downloading ? 'Generating...' : 'Download YEDA Letterhead (.docx)'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default YedaHeaderSheetDownload;