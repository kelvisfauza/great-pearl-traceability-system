import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Landmark, Printer, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

const LOGO_URL = '/lovable-uploads/great-agro-coffee-logo.png';

const loadImage = (url: string): Promise<string | null> =>
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

const PER_PAGE = 4;

const AgentBankingSlipTemplateDownload = () => {
  const [pages, setPages] = useState(1);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    // Reserve the window inside the click so pop-up blockers allow it.
    const win = window.open('', '_blank');
    setBusy(true);
    try {
      const count = Math.min(Math.max(pages, 1), 50) * PER_PAGE;
      const { data, error } = await (supabase as any).rpc('issue_agent_payment_slips', { p_count: count });
      if (error) throw error;
      const numbers: string[] = data || [];
      const logo = await loadImage(LOGO_URL);
      const doc = new jsPDF('p', 'mm', 'a4');
      const W = 210, m = 10, slipH = 66, gap = 4;
      const top = 8;

      numbers.forEach((num, i) => {
        if (i > 0 && i % PER_PAGE === 0) doc.addPage();
        const y = top + (i % PER_PAGE) * (slipH + gap);
        doc.setLineWidth(0.4);
        doc.rect(m, y, W - m * 2, slipH);
        if (logo) { try { doc.addImage(logo, 'PNG', m + 3, y + 3, 13, 13); } catch { /* ignore */ } }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
        doc.text('GREAT AGRO COFFEE', m + 19, y + 8);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8);
        doc.text('a member of YEDA COFFEE COMPANY LIMITED', m + 19, y + 11.5);
        doc.text('P.O Box 431420, Kasese, Uganda  |  +256 393 001 626', m + 19, y + 14.5);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
        doc.text('AGENT BANKING PAYMENT ORDER', W - m - 3, y + 8, { align: 'right' });
        doc.setTextColor(180, 0, 0); doc.setFontSize(11);
        doc.text(`No: ${num}`, W - m - 3, y + 14, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(m + 2, y + 18, W - m - 2, y + 18);

        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
        const L = m + 4, R = W - m - 4;
        const line = (label: string, yy: number, x1 = L, x2 = R) => {
          doc.text(label, x1, yy);
          doc.line(x1 + doc.getTextWidth(label) + 1.5, yy + 0.8, x2, yy + 0.8);
        };
        line('Date:', y + 25, L, L + 55);
        line('Agent name:', y + 25, L + 62, R);
        doc.text('Please pay the supplier below on behalf of Great Agro Coffee:', L, y + 32);
        line('Supplier name:', y + 39);
        line('Amount (UGX):', y + 46, L, L + 70);
        line('Phone / ID:', y + 46, L + 76, R);
        line('Amount in words:', y + 53);

        doc.setFontSize(7.5);
        const sw = (R - L - 8) / 3;
        ['Finance signature & stamp', 'Agent signature', 'Supplier signature (received)'].forEach((t, k) => {
          const x = L + k * (sw + 4);
          doc.line(x, y + 60.5, x + sw, y + 60.5);
          doc.text(t, x, y + 63.5);
        });

        if (i % PER_PAGE !== PER_PAGE - 1) {
          doc.setLineDashPattern([1.5, 1.5], 0);
          doc.line(4, y + slipH + gap / 2, W - 4, y + slipH + gap / 2);
          doc.setLineDashPattern([], 0);
        }
      });

      await doc.save(`Agent-Banking-Slips-${numbers[0]}.pdf`);
      const url = doc.output('bloburl') as unknown as string;
      if (win) { win.location.href = url; } else { window.open(url, '_blank'); }
      toast({ title: 'Slips ready', description: `${numbers.length} numbered slips (${numbers[0]} – ${numbers[numbers.length - 1]}).` });
    } catch (e: any) {
      win?.close();
      toast({ title: 'Could not prepare slips', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5" /> Agent Banking Payment Order</CardTitle>
        <CardDescription>4 numbered slips per A4 page for agents paying suppliers on our behalf — supplier name, amount and Finance signature.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="agent-pages">Number of pages</Label>
          <Input id="agent-pages" type="number" min={1} max={50} value={pages} onChange={(e) => setPages(Number(e.target.value) || 1)} className="w-28" />
        </div>
        <Button onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
          Print {Math.max(pages, 1) * PER_PAGE} slips
        </Button>
      </CardContent>
    </Card>
  );
};

export default AgentBankingSlipTemplateDownload;
