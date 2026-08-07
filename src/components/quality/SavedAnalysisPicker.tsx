import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Paperclip, ExternalLink, Loader2, Search, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'quality-analysis-files';

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
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FileRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('quality_analysis_files')
      .select('id, supplier_name, source_type, analysis_date, form_number, coffee_type, file_path, file_name')
      .order('created_at', { ascending: false })
      .limit(200);
    setRows((data as FileRow[]) || []);
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
          ) : filtered.length === 0 ? (
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SavedAnalysisPicker;
