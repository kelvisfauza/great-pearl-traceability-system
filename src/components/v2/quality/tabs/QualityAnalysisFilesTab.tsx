import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { FileUp, Loader2, Paperclip, ExternalLink, Trash2, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateVerificationCode } from '@/utils/verificationCode';

const BUCKET = 'quality-analysis-files';
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024;

interface SupplierRow { id: string; name: string; code?: string | null }
interface FileRow {
  id: string;
  supplier_name: string;
  source_type: string;
  analysis_date: string;
  form_number: string | null;
  coffee_type: string | null;
  notes: string | null;
  file_path: string;
  file_name: string;
  verification_code: string | null;
  uploaded_by: string;
  uploaded_by_email: string | null;
  created_at: string;
}

const QualityAnalysisFilesTab = () => {
  const [rows, setRows] = useState<FileRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  // form state
  const [sourceType, setSourceType] = useState<'supplier' | 'offer_sample'>('supplier');
  const [supplierId, setSupplierId] = useState('');
  const [manualName, setManualName] = useState('');
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().slice(0, 10));
  const [formNumber, setFormNumber] = useState('');
  const [coffeeType, setCoffeeType] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: files }, { data: sups }, { data: auth }] = await Promise.all([
      (supabase as any).from('quality_analysis_files').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('suppliers').select('id, name, code').order('name'),
      supabase.auth.getUser(),
    ]);
    setRows((files as FileRow[]) || []);
    setSuppliers((sups as SupplierRow[]) || []);
    setUserId(auth?.user?.id ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setSourceType('supplier'); setSupplierId(''); setManualName('');
    setAnalysisDate(new Date().toISOString().slice(0, 10));
    setFormNumber(''); setCoffeeType(''); setNotes(''); setFile(null);
  };

  const handleUpload = async () => {
    const supplierName = sourceType === 'supplier'
      ? suppliers.find((s) => s.id === supplierId)?.name || ''
      : manualName.trim();

    if (!supplierName) {
      toast({ title: 'Missing supplier', description: 'Select a supplier or enter the offer sample name.', variant: 'destructive' });
      return;
    }
    if (!file) {
      toast({ title: 'No file', description: 'Attach the scanned analysis (PDF or image).', variant: 'destructive' });
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      toast({ title: 'Unsupported file', description: 'Upload a PDF, JPEG or PNG.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: 'File too large', description: 'Maximum size is 10MB.', variant: 'destructive' });
      return;
    }

    try {
      setBusy(true);
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) throw new Error('You must be signed in to upload.');

      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type, upsert: false, cacheControl: '3600',
      });
      if (upErr) throw upErr;

      const { error: insErr } = await (supabase as any).from('quality_analysis_files').insert({
        supplier_id: sourceType === 'supplier' ? supplierId : null,
        supplier_name: supplierName,
        source_type: sourceType,
        analysis_date: analysisDate,
        form_number: formNumber.trim() || null,
        coffee_type: coffeeType || null,
        notes: notes.trim() || null,
        file_path: path,
        file_name: file.name,
        file_type: file.type,
        verification_code: generateVerificationCode('assessment'),
        uploaded_by: uid,
        uploaded_by_email: authData?.user?.email ?? null,
      });
      if (insErr) throw insErr;

      toast({ title: 'Analysis attached', description: `${supplierName} — ${file.name}` });
      setOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message || 'Could not save the analysis.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const openFile = async (row: FileRow) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.file_path, 3600);
    if (error || !data?.signedUrl) {
      toast({ title: 'Cannot open file', description: error?.message || 'File unavailable', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const removeRow = async (row: FileRow) => {
    if (!confirm(`Delete the analysis for ${row.supplier_name}?`)) return;
    const { error } = await (supabase as any).from('quality_analysis_files').delete().eq('id', row.id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    await supabase.storage.from(BUCKET).remove([row.file_path]);
    toast({ title: 'Deleted' });
    load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.supplier_name, r.form_number, r.coffee_type, r.notes].some((v) => (v || '').toLowerCase().includes(q)),
    );
  }, [rows, search]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-primary" />
            Quality Analysis Files
          </CardTitle>
          <CardDescription>
            Attach the scanned store analysis sheets. Pick a registered supplier, or choose Offer Sample and type the name.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
          <DialogTrigger asChild>
            <Button className="gap-2"><FileUp className="h-4 w-4" /> Attach Analysis</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Attach Scanned Quality Analysis</DialogTitle></DialogHeader>
            <div className="space-y-4">
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
                  <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="e.g. Kyondo Farmers Group" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Analysis date</Label>
                  <Input type="date" value={analysisDate} onChange={(e) => setAnalysisDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Form number (optional)</Label>
                  <Input value={formNumber} onChange={(e) => setFormNumber(e.target.value)} placeholder="GAC QA 0001" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Coffee type (optional)</Label>
                <Select value={coffeeType} onValueChange={setCoffeeType}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARABICA">Arabica</SelectItem>
                    <SelectItem value="ROBUSTA">Robusta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Observations on the analysis" />
              </div>

              <div className="space-y-2">
                <Label>Scanned analysis (PDF, JPG, PNG — max 10MB)</Label>
                <Input type="file" accept=".pdf,image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
              <Button onClick={handleUpload} disabled={busy} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search supplier, form no., notes" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading files…
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No analysis files attached yet.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.supplier_name}</span>
                    {r.source_type === 'offer_sample' && <Badge variant="secondary">Offer sample</Badge>}
                    {r.coffee_type && <Badge variant="outline">{r.coffee_type}</Badge>}
                    {r.form_number && <Badge variant="outline">{r.form_number}</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {new Date(r.analysis_date).toLocaleDateString()} · {r.file_name}
                    {r.uploaded_by_email ? ` · ${r.uploaded_by_email}` : ''}
                  </p>
                  {r.notes && <p className="truncate text-xs text-muted-foreground">{r.notes}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => openFile(r)}>
                    <ExternalLink className="h-3.5 w-3.5" /> View
                  </Button>
                  {userId === r.uploaded_by && (
                    <Button size="sm" variant="ghost" onClick={() => removeRow(r)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QualityAnalysisFilesTab;
