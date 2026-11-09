import { useEffect, useState } from 'react';
import { Landmark, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import logoUrl from '@/assets/great-agro-coffee-logo.png';
import { buildSupplierBankConfirmationPdf } from '@/utils/supplierBankConfirmationPdf';
import { preparePdfPrint } from '@/utils/pdfPrintStamp';

const filename = 'Great-Agro-Equity-Kasese-Bwambale-James-Confirmation.pdf';

export default function SupplierBankConfirmationDownload() {
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function prepare() {
    setBusy(true);
    try {
      const image = new Image();
      image.src = logoUrl;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('The company logo could not be prepared.');
      context.drawImage(image, 0, 0);
      const doc = buildSupplierBankConfirmationPdf(canvas.toDataURL('image/png'));
      await preparePdfPrint(doc, 'Equity Bank Kasese supplier advance confirmation - Bwambale James');
      const ready = new File([doc.output('blob')], filename, { type: 'application/pdf' });
      setFile(ready);
      setUrl(URL.createObjectURL(ready));
    } catch (error) {
      toast({ title: 'Letter could not be prepared', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  }

  async function download() {
    if (!file || !url) return;
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Bank confirmation letter' }); return; }
      catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-5 w-5 shrink-0 text-primary" />Equity Bank Confirmation Letter — Kasese Branch</CardTitle>
      <CardDescription>Bwambale James · UGX 20,000,000 supplier advance · Main season 2026/2027 · Twekyo agent banking</CardDescription>
    </CardHeader>
    <CardContent>
      <Button onClick={file ? download : prepare} disabled={busy} className="gap-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {busy ? 'Preparing letter…' : file ? 'Download PDF' : 'Prepare confirmation letter'}
      </Button>
    </CardContent>
  </Card>;
}