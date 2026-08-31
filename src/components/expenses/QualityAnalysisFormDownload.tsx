import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Download, ClipboardCheck, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
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

type FieldKey =
  | 'supplier_name' | 'dispatch_number' | 'analysis_date' | 'grams' | 'moisture' | 'below12' | 'gp1' | 'gp2'
  | 'pods' | 'husks' | 'non_coffee' | 'outturn' | 'robusta' | 'price' | 'analysed_by' | 'comments';

const ROWS: { key?: FieldKey; label: string; hint?: string }[] = [
  { label: 'Form No.' },
  { key: 'dispatch_number', label: 'Store Dispatch No.', hint: 'e.g. GAC-DM-2608-0001' },
  { key: 'supplier_name', label: 'Supplier Name' },
  { key: 'analysis_date', label: 'Date' },
  { key: 'grams', label: 'Grams Used (Sample Weight)' },
  { key: 'moisture', label: 'Moisture Content (M.C %)' },
  { key: 'below12', label: 'Below 12% (%)' },
  { key: 'gp1', label: 'Group 1 Defects (%)' },
  { key: 'gp2', label: 'Group 2 Defects (%)' },
  { key: 'pods', label: 'Pods (%)' },
  { key: 'husks', label: 'Husks (%)' },
  { key: 'non_coffee', label: 'Non-Coffee (%)' },
  { key: 'outturn', label: 'Outturn (%)' },
  { key: 'robusta', label: 'Robusta', hint: 'Yes / No' },
  { key: 'price', label: 'Price (UGX per KG)' },
  { key: 'analysed_by', label: 'Analysed By' },
  { key: 'comments', label: 'Comments' },
];

type Values = Partial<Record<FieldKey, string>>;

const generateQualityForm = async (
  entries: { formNumber: string; values?: Values }[],
  filled: boolean,
) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;

  const logoData = await loadImageAsBase64(LOGO_URL);

  const drawPage = (
    formNumber: string,
    qr: Awaited<ReturnType<typeof buildDocumentQr>>,
    values?: Values,
  ) => {
    if (logoData) {
      try { doc.addImage(logoData, 'PNG', margin, 4, 18, 18); } catch {}
    }

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('GREAT AGRO COFFEE', margin + 24, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('a member of YEDA COFFEE COMPANY LIMITED', margin + 24, 16);
    doc.text('P.O Box 431420, Kasese, Uganda  |  +256 393 001 626 / +256 393 101 103  |  info@greatpearlcoffee.com', margin + 24, 21);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('QUALITY ANALYSIS FORM', pageW - margin, 14, { align: 'right' });

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, 26, pageW - margin, 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('QUALITY ANALYSIS FORM', pageW / 2, 34, { align: 'center' });

    // Table
    let y = 40;
    const labelW = contentW * 0.42;
    const valueW = contentW - labelW;
    const bottomBlock = filled ? 74 : 24; // room for signatures + QR when filled
    const rowH = Math.min(13, (pageH - y - bottomBlock) / ROWS.length);

    doc.setLineWidth(0.35);
    doc.setDrawColor(0, 0, 0);

    ROWS.forEach((r, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, y, contentW, rowH, 'F');
      }
      doc.rect(margin, y, labelW, rowH);
      doc.rect(margin + labelW, y, valueW, rowH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(r.label, margin + 3, y + rowH / 2 + 1);

      const filledValue = r.key ? (values?.[r.key] || '').toString().trim() : '';
      if (r.label === 'Form No.') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(formNumber, margin + labelW + 4, y + rowH / 2 + 1);
      } else if (filledValue) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const text = doc.splitTextToSize(filledValue, valueW - 8)[0] || filledValue;
        doc.text(text, margin + labelW + 4, y + rowH / 2 + 1);
      } else if (r.hint) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(r.hint, margin + labelW + 4, y + rowH / 2 + 1);
      }
      y += rowH;
    });

    if (filled) {
      // Signature / stamp boxes
      const boxY = y + 6;
      const boxH = 26;
      const boxW = (contentW - 6) / 2;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);
      doc.rect(margin, boxY, boxW, boxH);
      doc.rect(margin + boxW + 6, boxY, boxW, boxH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('QUALITY PERSONNEL — Sign & Stamp', margin + 2, boxY + 5);
      doc.text('QUALITY MANAGER — Verify, Sign & Stamp', margin + boxW + 8, boxY + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(90, 90, 90);
      doc.text('Name: ......................................', margin + 2, boxY + 17);
      doc.text('Date: ..................', margin + 2, boxY + 23);
      doc.text('Name: ......................................', margin + boxW + 8, boxY + 17);
      doc.text('Date: ..................', margin + boxW + 8, boxY + 23);
      doc.setTextColor(0, 0, 0);

      drawQrBlock(doc, qr, pageW - margin - 20, boxY + boxH + 3, 20, 'Scan to load this analysis');
    } else {
      drawQrBlock(doc, qr, pageW - margin - 20, pageH - 44, 20, 'Scan to verify this form');
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 16, pageW - margin, pageH - 16);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(
      'Great Agro Coffee  |  a member of YEDA Coffee Company Limited  |  P.O Box 431420, Kasese, Uganda  |  www.greatpearlcoffee.com',
      pageW / 2,
      pageH - 10,
      { align: 'center' },
    );
  };

  for (let idx = 0; idx < entries.length; idx++) {
    if (idx > 0) doc.addPage();
    const qr = await buildDocumentQr(entries[idx].formNumber.replace(/\s+/g, '-'));
    drawPage(entries[idx].formNumber, qr, entries[idx].values);
  }

  const first = entries[0].formNumber;
  const last = entries[entries.length - 1].formNumber;
  doc.save(
    entries.length > 1
      ? `Quality-Analysis-Forms-${first}-to-${last}.pdf`.replace(/\s/g, '')
      : `Quality-Analysis-Form-${first}.pdf`.replace(/\s/g, ''),
  );
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

const emptyValues: Values = {
  supplier_name: '', analysis_date: new Date().toISOString().slice(0, 10), grams: '', moisture: '',
  below12: '', gp1: '', gp2: '', pods: '', husks: '', non_coffee: '', outturn: '',
  robusta: '', price: '', analysed_by: '', comments: '',
};

const NUMERIC_FIELDS: { key: FieldKey; label: string }[] = [
  { key: 'grams', label: 'Grams used (sample weight)' },
  { key: 'moisture', label: 'Moisture (M.C %)' },
  { key: 'below12', label: 'Below 12 (%)' },
  { key: 'gp1', label: 'Group 1 defects (%)' },
  { key: 'gp2', label: 'Group 2 defects (%)' },
  { key: 'pods', label: 'Pods (%)' },
  { key: 'husks', label: 'Husks (%)' },
  { key: 'non_coffee', label: 'Non-coffee (%)' },
  { key: 'outturn', label: 'Outturn (%)' },
  { key: 'price', label: 'Price (UGX per KG)' },
];

const QualityAnalysisFormDownload = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'blank' | 'filled'>('blank');
  const [copies, setCopies] = useState(1);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<Values>(emptyValues);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; code?: string | null }[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [sourceType, setSourceType] = useState<'supplier' | 'offer_sample'>('supplier');

  useEffect(() => {
    if (!open || suppliers.length) return;
    supabase.from('suppliers').select('id, name, code').order('name').then(({ data }) => {
      setSuppliers((data as any[]) || []);
    });
  }, [open]);

  const setField = (key: FieldKey, v: string) => setValues((prev) => ({ ...prev, [key]: v }));

  const issueNumbers = async (count: number): Promise<string[]> => {
    const { data, error } = await (supabase as any).rpc('issue_quality_form_numbers', {
      p_count: count,
      p_issued_by_name: null,
    });
    if (error) throw error;
    const numbers: string[] = (data as string[]) || [];
    if (!numbers.length) throw new Error('No form numbers were issued');
    return numbers;
  };

  const handleGenerateBlank = async () => {
    const count = Math.max(1, Math.min(100, Number(copies) || 1));
    try {
      setBusy(true);
      const numbers = await issueNumbers(count);
      await generateQualityForm(numbers.map((n) => ({ formNumber: n })), false);
      setOpen(false);
      toast({
        title: `${numbers.length} form(s) ready`,
        description: `Form numbers ${numbers[0]}${numbers.length > 1 ? ` → ${numbers[numbers.length - 1]}` : ''} issued.`,
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'Failed to generate form.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateFilled = async () => {
    const supplierName = sourceType === 'supplier'
      ? suppliers.find((s) => s.id === supplierId)?.name || ''
      : (values.supplier_name || '').trim();

    if (!supplierName) {
      toast({ title: 'Supplier required', description: 'Select a supplier or type the offer sample name.', variant: 'destructive' });
      return;
    }
    if (!values.moisture) {
      toast({ title: 'Moisture required', description: 'Enter the moisture content before printing.', variant: 'destructive' });
      return;
    }

    try {
      setBusy(true);
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) throw new Error('You must be signed in.');

      const [formNumber] = await issueNumbers(1);
      const code = formNumber.replace(/\s+/g, '-');
      const finalValues: Values = { ...values, supplier_name: supplierName };

      const { error } = await (supabase as any).from('quality_analysis_forms').insert({
        form_number: formNumber,
        verification_code: code,
        supplier_id: sourceType === 'supplier' ? supplierId : null,
        supplier_name: supplierName,
        source_type: sourceType,
        analysis_date: finalValues.analysis_date || new Date().toISOString().slice(0, 10),
        params: finalValues,
        analysed_by: finalValues.analysed_by || null,
        comments: finalValues.comments || null,
        created_by: uid,
        created_by_email: authData?.user?.email ?? null,
      });
      if (error) throw error;

      await generateQualityForm([{ formNumber, values: finalValues }], true);
      setOpen(false);
      setValues(emptyValues);
      setSupplierId('');
      toast({
        title: `${formNumber} saved & printed`,
        description: 'Stamp the printout, then scan its QR when attaching the signed copy in Analysis Files.',
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'Failed to save the analysis.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card className="border-2 border-primary/20 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Quality Analysis Form
          </CardTitle>
          <CardDescription className="text-xs">
            Print blank sheets, or capture the physical assessment parameters and print a filled form
            with a QR code for stamping and verification by the quality manager.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setOpen(true)} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Create / Download Form
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quality Analysis Form</DialogTitle>
            <DialogDescription>
              Numbering (GAC QA 0001) is issued by the system and resets at the start of each month.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="blank">Blank copies</TabsTrigger>
              <TabsTrigger value="filled">Filled analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="blank" className="pt-4 space-y-2">
              <Label htmlFor="qa-copies">Number of forms to print (1 - 100)</Label>
              <Input
                id="qa-copies"
                type="number"
                min={1}
                max={100}
                value={copies}
                onChange={(e) => setCopies(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Each copy gets its own unique form number and verification QR code.
              </p>
            </TabsContent>

            <TabsContent value="filled" className="pt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sample source</Label>
                  <Select value={sourceType} onValueChange={(v) => setSourceType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplier">Registered supplier</SelectItem>
                      <SelectItem value="offer_sample">Offer sample (not in system)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {sourceType === 'supplier' ? (
                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Offer sample name</Label>
                    <Input
                      value={values.supplier_name || ''}
                      onChange={(e) => setField('supplier_name', e.target.value)}
                      placeholder="e.g. Kyondo Farmers Group"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Analysis date</Label>
                  <Input
                    type="date"
                    value={values.analysis_date || ''}
                    onChange={(e) => setField('analysis_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Robusta?</Label>
                  <Select value={values.robusta || ''} onValueChange={(v) => setField('robusta', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {NUMERIC_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-2">
                    <Label>{f.label}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={values[f.key] || ''}
                      onChange={(e) => setField(f.key, e.target.value)}
                    />
                  </div>
                ))}

                <div className="space-y-2 sm:col-span-2">
                  <Label>Analysed by</Label>
                  <Input
                    value={values.analysed_by || ''}
                    onChange={(e) => setField('analysed_by', e.target.value)}
                    placeholder="Name of quality personnel"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Comments</Label>
                  <Textarea
                    rows={2}
                    value={values.comments || ''}
                    onChange={(e) => setField('comments', e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The printout carries the values above, a QR code and stamp boxes for the quality personnel
                and the quality manager. After stamping, scan the QR in Quality → Analysis Files to attach
                the signed copy.
              </p>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button
              onClick={mode === 'blank' ? handleGenerateBlank : handleGenerateFilled}
              disabled={busy}
              className="gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {mode === 'blank' ? 'Generate & Print' : 'Save & Print'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QualityAnalysisFormDownload;
