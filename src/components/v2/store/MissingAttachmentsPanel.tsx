import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Paperclip, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { uploadReportDocument, hasAttachments, getReportDocumentUrl } from '@/utils/reportDocuments';

type Row = {
  id: string;
  date: string;
  coffee_type: string;
  input_by: string;
  attachment_url: string | null;
  delivery_note_url: string | null;
  dispatch_report_url: string | null;
};

const MissingAttachmentsPanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_reports')
      .select('id,date,coffee_type,input_by,attachment_url,delivery_note_url,dispatch_report_url')
      .order('date', { ascending: false })
      .limit(500);
    if (error) toast.error('Could not load store reports');
    setRows(((data as any[]) || []).filter((r) => !hasAttachments(r)) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const attach = async (row: Row, file: File | undefined) => {
    if (!file) return;
    setBusyId(row.id);
    try {
      const path = await uploadReportDocument(file);
      const { error } = await supabase
        .from('store_reports')
        .update({ attachment_url: path, attachment_name: file.name, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) throw error;
      toast.success('Document attached');
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e: any) {
      toast.error(e?.message || 'Attachment failed');
    } finally {
      setBusyId(null);
    }
  };

  const preview = async (row: Row) => {
    const url = await getReportDocumentUrl(row.attachment_url);
    if (url) window.open(url, '_blank');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Reports Missing Documents
          </CardTitle>
          <CardDescription>
            Attach the scanned delivery note or store document to reports saved without one.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">All store reports have documents attached.</p>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            <Badge variant="destructive" className="mb-1">{rows.length} missing</Badge>
            {rows.map((row) => (
              <div key={row.id} className="flex flex-col sm:flex-row sm:items-center gap-2 border rounded-md p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {row.coffee_type} — {row.date ? format(new Date(row.date), 'dd MMM yyyy') : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">Recorded by {row.input_by || 'Unknown'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="h-9 w-full sm:w-60 text-xs"
                    disabled={busyId === row.id}
                    onChange={(e) => attach(row, e.target.files?.[0])}
                  />
                  {busyId === row.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
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

export default MissingAttachmentsPanel;
