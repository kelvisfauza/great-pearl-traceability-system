import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Download, Receipt, Loader2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
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

interface LineItem {
  coffeeType: string;
  bags: string;
  kilograms: string;
  unitPrice: string;
}

interface ReceiptValues {
  receiptNo: string;
  date: string;
  buyerName: string;
  buyerContact: string;
  vehicleNo: string;
  paymentMethod: string;
  amountPaid: string;
  balance: string;
  remarks: string;
  issuedBy: string;
  items: LineItem[];
}

const num = (v: string) => {
  const n = parseFloat(String(v || '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const money = (n: number) => `UGX ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven',
  'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const chunkToWords = (n: number): string => {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`;
  return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ' ' + chunkToWords(n % 100) : ''}`;
};

const amountInWords = (amount: number): string => {
  let n = Math.floor(Math.abs(amount));
  if (n === 0) return 'Zero Shillings Only';
  const scales = [
    { v: 1_000_000_000, name: 'Billion' },
    { v: 1_000_000, name: 'Million' },
    { v: 1_000, name: 'Thousand' },
  ];
  const parts: string[] = [];
  for (const s of scales) {
    if (n >= s.v) {
      parts.push(`${chunkToWords(Math.floor(n / s.v))} ${s.name}`);
      n %= s.v;
    }
  }
  if (n > 0) parts.push(chunkToWords(n));
  return `${parts.join(' ')} Shillings Only`;
};

const COLUMNS: { label: string; w: number; align?: 'left' | 'center' | 'right' }[] = [
  { label: '#', w: 0.05, align: 'center' },
  { label: 'Coffee Type / Description', w: 0.31 },
  { label: 'Bags', w: 0.1, align: 'center' },
  { label: 'Weight (Kg)', w: 0.15, align: 'right' },
  { label: 'Rate (UGX/Kg)', w: 0.17, align: 'right' },
  { label: 'Amount (UGX)', w: 0.22, align: 'right' },
];

const generateSalesReceipt = async (v: ReceiptValues) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const margin = 12;
  const contentW = pageW - margin * 2;

  const logoData = await loadImageAsBase64(LOGO_URL);
  const qr = await buildDocumentQr();

  const items = v.items.filter(
    (i) => i.coffeeType.trim() || num(i.bags) || num(i.kilograms) || num(i.unitPrice),
  );
  const rows = [...items];
  while (rows.length < 5) rows.push({ coffeeType: '', bags: '', kilograms: '', unitPrice: '' });

  const totalBags = items.reduce((s, i) => s + num(i.bags), 0);
  const totalKg = items.reduce((s, i) => s + num(i.kilograms), 0);
  const totalAmount = items.reduce((s, i) => s + num(i.kilograms) * num(i.unitPrice), 0);
  const paid = v.amountPaid ? num(v.amountPaid) : totalAmount;
  const balance = v.balance ? num(v.balance) : Math.max(totalAmount - paid, 0);

  // Two copies on one page: Customer Copy + Office Copy
  const renderCopy = (topY: number, copyLabel: string) => {
    let y = topY;

    if (logoData) {
      try { doc.addImage(logoData, 'PNG', margin, y, 15, 15); } catch { /* ignore */ }
    }
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.text('GREAT AGRO COFFEE', margin + 18, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text('a member of YEDA COFFEE COMPANY LIMITED', margin + 18, y + 9);
    doc.text('P.O Box 431420, Kasese, Uganda  |  +256 393 001 626 / +256 393 101 103', margin + 18, y + 12);
    doc.text('info@greatpearlcoffee.com  |  www.greatpearlcoffee.com', margin + 18, y + 15);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('SALES RECEIPT', pageW - margin, y + 6, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(copyLabel, pageW - margin, y + 10.5, { align: 'right' });

    y += 17;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);

    // Meta block
    y += 3;
    const metaH = 8;
    const halfW = contentW / 2;
    doc.setLineWidth(0.3);
    const metaRow = (label1: string, val1: string, label2: string, val2: string) => {
      doc.rect(margin, y, halfW, metaH);
      doc.rect(margin + halfW, y, halfW, metaH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(label1, margin + 2.5, y + metaH / 2 + 1);
      doc.text(label2, margin + halfW + 2.5, y + metaH / 2 + 1);
      doc.setFont('helvetica', 'normal');
      doc.text(val1 || '________________________', margin + 30, y + metaH / 2 + 1);
      doc.text(val2 || '________________________', margin + halfW + 30, y + metaH / 2 + 1);
      y += metaH;
    };
    metaRow('Receipt No:', v.receiptNo, 'Date:', v.date);
    metaRow('Received From:', v.buyerName, 'Contact:', v.buyerContact);
    metaRow('Vehicle No:', v.vehicleNo, 'Payment Method:', v.paymentMethod);

    // Table head
    y += 3;
    const headH = 8;
    let x = margin;
    doc.setFillColor(235, 235, 235);
    doc.rect(margin, y, contentW, headH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    COLUMNS.forEach((c) => {
      const cw = contentW * c.w;
      doc.rect(x, y, cw, headH);
      const tx = c.align === 'right' ? x + cw - 2 : c.align === 'center' ? x + cw / 2 : x + 2;
      doc.text(c.label, tx, y + headH / 2 + 1.2, { align: c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left' });
      x += cw;
    });
    y += headH;

    // Rows
    const rowH = 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    rows.forEach((r, ri) => {
      x = margin;
      const amount = num(r.kilograms) * num(r.unitPrice);
      const values = [
        String(ri + 1),
        r.coffeeType || '',
        r.bags ? num(r.bags).toLocaleString() : '',
        r.kilograms ? num(r.kilograms).toLocaleString() : '',
        r.unitPrice ? num(r.unitPrice).toLocaleString() : '',
        amount ? amount.toLocaleString() : '',
      ];
      COLUMNS.forEach((c, ci) => {
        const cw = contentW * c.w;
        doc.rect(x, y, cw, rowH);
        const val = values[ci];
        if (val) {
          const tx = c.align === 'right' ? x + cw - 2 : c.align === 'center' ? x + cw / 2 : x + 2;
          doc.text(val, tx, y + rowH / 2 + 1.2, {
            align: c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left',
          });
        }
        x += cw;
      });
      y += rowH;
    });

    // Totals row
    x = margin;
    doc.setFillColor(242, 242, 242);
    doc.rect(margin, y, contentW, rowH, 'F');
    const totals = [
      '',
      'TOTAL',
      totalBags ? totalBags.toLocaleString() : '',
      totalKg ? totalKg.toLocaleString() : '',
      '',
      totalAmount ? totalAmount.toLocaleString() : '',
    ];
    doc.setFont('helvetica', 'bold');
    COLUMNS.forEach((c, ci) => {
      const cw = contentW * c.w;
      doc.rect(x, y, cw, rowH);
      const val = totals[ci];
      if (val) {
        const tx = c.align === 'right' ? x + cw - 2 : c.align === 'center' ? x + cw / 2 : x + 2;
        doc.text(val, tx, y + rowH / 2 + 1.2, {
          align: c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left',
        });
      }
      x += cw;
    });
    y += rowH + 3;

    // Amount summary
    const sumH = 7;
    const labelW = contentW * 0.62;
    const valW = contentW - labelW;
    const sumRow = (label: string, val: string, shaded = false) => {
      if (shaded) {
        doc.setFillColor(0, 0, 0);
        doc.rect(margin, y, contentW, sumH, 'F');
        doc.setTextColor(255, 255, 255);
      }
      doc.setDrawColor(0, 0, 0);
      doc.rect(margin, y, labelW, sumH);
      doc.rect(margin + labelW, y, valW, sumH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(label, margin + 2.5, y + sumH / 2 + 1.2);
      doc.text(val, pageW - margin - 2.5, y + sumH / 2 + 1.2, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += sumH;
    };
    sumRow('TOTAL VALUE OF COFFEE PURCHASED', totalAmount ? money(totalAmount) : '________________', true);
    sumRow('Amount Paid', paid ? money(paid) : '________________');
    sumRow('Balance Outstanding', money(balance));

    // Amount in words
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Amount in words:', margin, y + 3);
    doc.setFont('helvetica', 'italic');
    const words = totalAmount ? amountInWords(paid || totalAmount) : '____________________________________________________';
    doc.text(doc.splitTextToSize(words, contentW - 30), margin + 28, y + 3);
    y += 7;

    // Remarks
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Remarks:', margin, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setLineWidth(0.3);
    doc.rect(margin + 18, y - 1, contentW - 18, 9);
    if (v.remarks) doc.text(doc.splitTextToSize(v.remarks, contentW - 24), margin + 20, y + 2.5);
    y += 13;

    // Signatures
    const sigW = (contentW - 12) / 2;
    doc.setLineWidth(0.3);
    doc.line(margin, y + 6, margin + sigW, y + 6);
    doc.line(pageW - margin - sigW, y + 6, pageW - margin, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Issued by: ${v.issuedBy || ''}`, margin, y + 4);
    doc.text('Sales / Store Officer (Sign & Date)', margin, y + 10);
    doc.text('Buyer (Name, Signature & Date)', pageW - margin - sigW, y + 10);

    // QR
    drawQrBlock(doc, qr, pageW - margin - 16, y + 13, 16, 'Scan to verify');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.2);
    doc.setTextColor(80, 80, 80);
    doc.text(
      'Goods once sold and weighed at our store are checked and accepted by the buyer. Thank you for your business.',
      margin,
      y + 32,
    );
    doc.setTextColor(0, 0, 0);
  };

  renderCopy(10, "CUSTOMER'S COPY");

  // Divider between copies
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(margin, pageH / 2 + 4, pageW - margin, pageH / 2 + 4);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.2);
  doc.text('cut here', pageW / 2, pageH / 2 + 2.5, { align: 'center' });

  renderCopy(pageH / 2 + 9, 'OFFICE COPY');

  const fileName = `Sales-Receipt-${(v.receiptNo || 'blank').replace(/[^\w-]/g, '') || 'blank'}.pdf`;
  doc.save(fileName);
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

const emptyItem = (): LineItem => ({ coffeeType: '', bags: '', kilograms: '', unitPrice: '' });

const SalesReceiptTemplateDownload = () => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<ReceiptValues>({
    receiptNo: '',
    date: new Date().toLocaleDateString('en-GB'),
    buyerName: '',
    buyerContact: '',
    vehicleNo: '',
    paymentMethod: '',
    amountPaid: '',
    balance: '',
    remarks: '',
    issuedBy: '',
    items: [emptyItem()],
  });

  const set = (k: keyof ReceiptValues, val: any) => setValues((p) => ({ ...p, [k]: val }));
  const setItem = (idx: number, k: keyof LineItem, val: string) =>
    setValues((p) => ({ ...p, items: p.items.map((it, i) => (i === idx ? { ...it, [k]: val } : it)) }));

  const totalKg = values.items.reduce((s, i) => s + num(i.kilograms), 0);
  const totalBags = values.items.reduce((s, i) => s + num(i.bags), 0);
  const totalAmount = values.items.reduce((s, i) => s + num(i.kilograms) * num(i.unitPrice), 0);

  const handleGenerate = async () => {
    try {
      setBusy(true);
      await generateSalesReceipt(values);
      setOpen(false);
      toast({ title: 'Receipt ready', description: 'PDF downloaded and print preview opened (2 copies).' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'Failed to generate receipt.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="border-2 border-primary/20 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-5 w-5 text-primary" />
            Coffee Sales Receipt (Buyer)
          </CardTitle>
          <CardDescription className="text-xs">
            Fill in the buyer, coffee type, bags, weight and rate — the receipt totals and amount in words are
            calculated automatically and printed as two A4 copies (customer copy and office copy).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setOpen(true)} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Fill &amp; Print Receipt
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Coffee Sales Receipt</DialogTitle>
            <DialogDescription>
              Enter the sale details. Leave any field blank to write it by hand after printing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sr-no">Receipt No.</Label>
                <Input id="sr-no" placeholder="e.g. GAC-SR-0001" value={values.receiptNo}
                  onChange={(e) => set('receiptNo', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sr-date">Date</Label>
                <Input id="sr-date" placeholder="dd/mm/yyyy" value={values.date}
                  onChange={(e) => set('date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sr-vehicle">Vehicle No.</Label>
                <Input id="sr-vehicle" placeholder="e.g. UBK 123X" value={values.vehicleNo}
                  onChange={(e) => set('vehicleNo', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sr-buyer">Buyer / Received From</Label>
                <Input id="sr-buyer" placeholder="Buyer name or company" value={values.buyerName}
                  onChange={(e) => set('buyerName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sr-contact">Buyer Contact</Label>
                <Input id="sr-contact" placeholder="e.g. 0770 000 000" value={values.buyerContact}
                  onChange={(e) => set('buyerContact', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sr-method">Payment Method</Label>
                <Input id="sr-method" placeholder="Cash / Bank / Mobile Money" value={values.paymentMethod}
                  onChange={(e) => set('paymentMethod', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Coffee Sold</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1"
                  onClick={() => set('items', [...values.items, emptyItem()])}>
                  <Plus className="h-3.5 w-3.5" /> Add line
                </Button>
              </div>
              {values.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end border rounded-md p-2">
                  <div className="space-y-1 col-span-2 sm:col-span-2">
                    <Label className="text-xs">Coffee Type</Label>
                    <Input placeholder="e.g. Robusta FAQ" value={item.coffeeType}
                      onChange={(e) => setItem(idx, 'coffeeType', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bags</Label>
                    <Input type="number" placeholder="0" value={item.bags}
                      onChange={(e) => setItem(idx, 'bags', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Weight (Kg)</Label>
                    <Input type="number" placeholder="0" value={item.kilograms}
                      onChange={(e) => setItem(idx, 'kilograms', e.target.value)} />
                  </div>
                  <div className="space-y-1 flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Rate / Kg</Label>
                      <Input type="number" placeholder="0" value={item.unitPrice}
                        onChange={(e) => setItem(idx, 'unitPrice', e.target.value)} />
                    </div>
                    {values.items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon"
                        onClick={() => set('items', values.items.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <div className="text-xs text-muted-foreground">
                Totals: {totalBags.toLocaleString()} bags · {totalKg.toLocaleString()} kg · {money(totalAmount)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sr-paid">Amount Paid (UGX)</Label>
                <Input id="sr-paid" type="number" placeholder={String(totalAmount || 0)} value={values.amountPaid}
                  onChange={(e) => set('amountPaid', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sr-balance">Balance (UGX)</Label>
                <Input id="sr-balance" type="number" placeholder="auto" value={values.balance}
                  onChange={(e) => set('balance', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sr-issued">Issued By</Label>
                <Input id="sr-issued" placeholder="Your name" value={values.issuedBy}
                  onChange={(e) => set('issuedBy', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sr-remarks">Remarks</Label>
              <Textarea id="sr-remarks" rows={2} placeholder="Optional notes" value={values.remarks}
                onChange={(e) => set('remarks', e.target.value)} />
            </div>
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

export default SalesReceiptTemplateDownload;
