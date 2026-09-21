import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, FileText, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useQuotations, QUOTATION_STATUS_LABEL } from '@/hooks/useQuotations';
import QuotationViewer from './QuotationViewer';
import QuotationReplyBox from './QuotationReplyBox';

/** Management approval of quotations already recommended by procurement. */
const QuotationApprovals = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const { quotations, loading, refresh, recordApproval, notifyCompany } = useQuotations();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const awaiting = useMemo(() => quotations.filter((q) => q.status === 'recommended'), [quotations]);

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    setBusy(id);
    try {
      await recordApproval(id, decision, notes[id] || '', { name: employee?.name, email: employee?.email });
      toast({ title: decision === 'approved' ? 'Quotation approved' : 'Quotation rejected' });
    } catch (err) {
      toast({ title: 'Could not save the decision', description: err instanceof Error ? err.message : 'Please try again', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  if (!loading && awaiting.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Quotations awaiting approval</CardTitle>
          <CardDescription>Reviewed and recommended by procurement — open the document before deciding.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : awaiting.map((q) => (
          <div key={q.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{q.company_name}</p>
                <p className="text-sm text-muted-foreground truncate">{q.subject}</p>
                <p className="text-xs text-muted-foreground mt-1">{q.email || 'no email'} · {q.phone || 'no phone'}</p>
              </div>
              <div className="ml-auto text-right space-y-1">
                {q.amount != null && (
                  <p className="font-semibold">{q.currency} {new Intl.NumberFormat('en-UG').format(q.amount)}</p>
                )}
                <Badge variant="secondary">{QUOTATION_STATUS_LABEL[q.status] || q.status}</Badge>
              </div>
            </div>

            {q.procurement_notes && (
              <p className="text-sm rounded bg-muted/50 p-2">
                <span className="font-medium">Procurement:</span> {q.procurement_notes}
                {q.procurement_by ? ` — ${q.procurement_by}` : ''}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpenId(openId === q.id ? null : q.id)}>
                <FileText className="h-4 w-4 mr-1" /> {openId === q.id ? 'Hide document' : 'View document'}
              </Button>
              <Button size="sm" onClick={() => decide(q.id, 'approved')} disabled={busy === q.id}>
                {busy === q.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />} Approve
              </Button>
              <Button variant="destructive" size="sm" onClick={() => decide(q.id, 'rejected')} disabled={busy === q.id}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>

            <div>
              <Label className="text-xs">Decision note</Label>
              <Textarea
                rows={2}
                value={notes[q.id] || ''}
                onChange={(e) => setNotes((n) => ({ ...n, [q.id]: e.target.value }))}
              />
            </div>

            {openId === q.id && (
              <div className="space-y-3 pt-2 border-t">
                <QuotationViewer path={q.file_path} name={q.file_name} />
                <QuotationReplyBox
                  quotationId={q.id}
                  companyEmail={q.email}
                  companyPhone={q.phone}
                  defaultSubject={`Your quotation — ${q.subject}`}
                  notify={notifyCompany}
                />
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default QuotationApprovals;
