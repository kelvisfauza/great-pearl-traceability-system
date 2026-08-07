import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Paperclip, ExternalLink, Loader2, Search, X, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'quality-analysis-files';
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024;

interface FileRow {
  id: string;
  supplier_name: string;
  source_type: string;
  analysis_date: string;
  form_number: string | null;
  coffee_type: string | null;
  file_path: string;
  file_name: string;
}

interface PendingForm {
  id: string;
  supplier_id: string | null;
  supplier_name: string;
  source_type: string;
  analysis_date: string;
  form_number: string | null;
  verification_code: string | null;
  params: any;
}

interface Props {
  value?: string | null;
  formNumber?: string;
  supplierHint?: string;
  disabled?: boolean;
  onChange: (file: { id: string; form_number: string | null; supplier_name: string } | null) => void;
}

/** Lets quality staff attach an already-uploaded (stamped) analysis form to a lot assessment. */
const SavedAnalysisPicker = ({ value, formNumber, supplierHint, disabled, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<FileRow[]>([]);
  const [pending, setPending] = useState<PendingForm[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FileRow | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: files }, { data: forms }] = await Promise.all([
      (supabase as any)
        .from('quality_analysis_files')
        .select('id, supplier_name, source_type, analysis_date, form_number, coffee_type, file_path, file_name, analysis_form_id')
        .order('created_at', { ascending: false })
        .limit(200),
      (supabase as any)
        .from('quality_analysis_forms')
        .select('id, supplier_id, supplier_name, source_type, analysis_date, form_number, verification_code, params')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
    const fileRows = (files as any[]) || [];
    setRows(fileRows as FileRow[]);
    const linked = new Set(fileRows.map((f) => f.analysis_form_id).filter(Boolean));
    const linkedNumbers = new Set(fileRows.map((f) => (f.form_number || '').trim()).filter(Boolean));
    setPending((((forms as PendingForm[]) || []).filter(
      (f) => !linked.has(f.id) && !linkedNumbers.has((f.form_number || '').trim())
    )));
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  useEffect(() => {
    if (!value) { setSelected(null); return; }
    if (selected?.id === value) return;
    (supabase as any)
      .from('quality_analysis_files')
      .select('id, supplier_name, source_type, analysis_date, form_number, coffee_type, file_path, file_name')
      .eq('id', value)
      .maybeSingle()
      .then(({ data }: any) => data && setSelected(data as FileRow));
  }, [value]);

  useEffect(() => {
    if (open) setSearch(formNumber?.trim() || supplierHint?.trim() || '');
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.supplier_name, r.form_number, r.coffee_type, r.file_name]
        .some((v) => (v || '').toLowerCase().includes(q)));
  }, [rows, search]);

  const filteredPending = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter((r) =>
      [r.supplier_name, r.form_number].some((v) => (v || '').toLowerCase().includes(q)));
  }, [pending, search]);

  /** Upload the stamped scan for a saved form, then attach it straight away. */
  const uploadForForm = async (form: PendingForm, file: File) => {
    if (!ALLOWED.includes(file.type)) {
      toast({ title: 'Unsupported file', description: 'Upload a PDF, JPEG or PNG.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: 'File too large', description: 'Maximum size is 10MB.', variant: 'destructive' });
      return;
    }
    try {
      setUploadingId(form.id);
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) throw new Error('You must be signed in to upload.');
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type, upsert: false, cacheControl: '3600',
      });
      if (upErr) throw upErr;

      const robusta = (form.params?.robusta || '').toString().toLowerCase();
      const { data: inserted, error: insErr } = await (supabase as any)
        .from('quality_analysis_files')
        .insert({
          supplier_id: form.supplier_id,
          supplier_name: form.supplier_name,
          source_type: form.source_type || 'supplier',
          analysis_date: form.analysis_date,
          form_number: form.form_number,
          coffee_type: robusta === 'yes' ? 'ROBUSTA' : robusta === 'no' ? 'ARABICA' : null,
          file_path: path,
          file_name: file.name,
          file_type: file.type,
          analysis_form_id: form.id,
          verification_code: form.verification_code,
          uploaded_by: uid,
          uploaded_by_email: authData?.user?.email ?? null,
        })
        .select('id, supplier_name, source_type, analysis_date, form_number, coffee_type, file_path, file_name')
        .single();
      if (insErr) throw insErr;

      await (supabase as any).from('quality_analysis_forms').update({ status: 'attached' }).eq('id', form.id);
      pick(inserted as FileRow);
      toast({ title: 'Analysis attached', description: `${form.supplier_name} — ${file.name}` });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message || 'Could not attach the analysis.', variant: 'destructive' });
    } finally {
      setUploadingId(null);
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

  const pick = (row: FileRow) => {
    setSelected(row);
    onChange({ id: row.id, form_number: row.form_number, supplier_name: row.supplier_name });
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {selected ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2 text-sm">
          <Paperclip className="h-4 w-4 text-primary" />
          <span className="font-medium">{selected.supplier_name}</span>
          {selected.form_number && <Badge variant="outline">{selected.form_number}</Badge>}
          <span className="text-xs text-muted-foreground">{selected.file_name}</span>
          <div className="ml-auto flex items-center gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => openFile(selected)}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            {!disabled && (
              <Button type="button" size="sm" variant="ghost" onClick={() => { setSelected(null); onChange(null); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" className="gap-2" disabled={disabled} onClick={() => setOpen(true)}>
          <Paperclip className="h-4 w-4" /> Attach saved analysis form
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attach a saved analysis</DialogTitle>
            <DialogDescription>
              Pick the stamped analysis form already uploaded in Quality → Analysis Files.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search supplier or form number" />
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : filtered.length === 0 && filteredPending.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No saved analysis files match.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{r.supplier_name}</span>
                      {r.form_number && <Badge variant="outline">{r.form_number}</Badge>}
                      {r.source_type === 'offer_sample' && <Badge variant="secondary">Offer sample</Badge>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {new Date(r.analysis_date).toLocaleDateString()} · {r.file_name}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => openFile(r)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="sm" onClick={() => pick(r)}>Attach</Button>
                  </div>
                </div>
              ))}
              {filteredPending.length > 0 && (
                <>
                  <p className="pt-2 text-xs font-medium text-muted-foreground">
                    Saved forms without a stamped scan — upload it to attach
                  </p>
                  {filteredPending.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-2 rounded-md border border-dashed p-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{f.supplier_name}</span>
                          {f.form_number && <Badge variant="outline">{f.form_number}</Badge>}
                          <Badge variant="secondary">Not uploaded</Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {new Date(f.analysis_date).toLocaleDateString()}
                        </p>
                      </div>
                      <label className="shrink-0">
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          className="hidden"
                          onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadForForm(f, file); e.currentTarget.value = ''; }}
                        />
                        <Button type="button" size="sm" variant="outline" asChild disabled={uploadingId === f.id}>
                          <span className="cursor-pointer gap-1">
                            {uploadingId === f.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Upload className="h-3.5 w-3.5" />}
                            Upload scan
                          </span>
                        </Button>
                      </label>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SavedAnalysisPicker;
