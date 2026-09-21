import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, RefreshCw, FileText, Loader2, Mail, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useQuotations, QUOTATION_STATUS_LABEL, type Quotation } from '@/hooks/useQuotations';
import QuotationViewer from './QuotationViewer';
import QuotationFormDialog from './QuotationFormDialog';
import QuotationReplyBox from './QuotationReplyBox';

const statusVariant = (status: string) => {
  if (status === 'approved') return 'default' as const;
  if (status === 'rejected' || status === 'rejected_procurement') return 'destructive' as const;
  if (status === 'recommended') return 'secondary' as const;
  return 'outline' as const;
};

const QuotationReviewPanel = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const {
    quotations, messages, loading, refresh,
    createQuotation, recordProcurementDecision, notifyCompany,
  } = useQuotations();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const pending = useMemo(() => quotations.filter((q) => ['submitted', 'revision_requested'].includes(q.status)), [quotations]);
  const decided = useMemo(() => quotations.filter((q) => !['submitted', 'revision_requested'].includes(q.status)), [quotations]);

  const decide = async (q: Quotation, decision: 'recommended' | 'revision_requested' | 'rejected_procurement') => {
    setBusy(q.id);
    try {
      await recordProcurementDecision(q.id, decision, notes[q.id] || '', { name: employee?.name, email: employee?.email });
      toast({ title: 'Review saved', description: 'You can now reply to the company below.' });
      setOpenId(q.id);
    } catch (err) {
      toast({ title: 'Could not save the review', description: err instanceof Error ? err.message : 'Please try again', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const renderCard = (q: Quotation, allowDecision: boolean) => {
    const history = messages[q.id] || [];
    const expanded = openId === q.id;
    return (
      <div key={q.id} className="rounded-lg border p-4 space-y-3">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{q.company_name}</p>
            <p className="text-sm text-muted-foreground truncate">{q.subject}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {q.contact_name ? `${q.contact_name} · ` : ''}{q.email || 'no email'} · {q.phone || 'no phone'}
            </p>
          </div>
          <div className="ml-auto text-right space-y-1">
            {q.amount != null && (
              <p className="font-semibold">{q.currency} {new Intl.NumberFormat('en-UG').format(q.amount)}</p>
            )}
            <Badge variant={statusVariant(q.status)}>{QUOTATION_STATUS_LABEL[q.status] || q.status}</Badge>
          </div>
        </div>

        {q.notes && <p className="text-sm">{q.notes}</p>}
        {q.procurement_notes && (
          <p className="text-sm rounded bg-muted/50 p-2">
            <span className="font-medium">Procurement note:</span> {q.procurement_notes}
            {q.procurement_by ? ` — ${q.procurement_by}` : ''}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpenId(expanded ? null : q.id)}>
            <FileText className="h-4 w-4 mr-1" /> {expanded ? 'Hide details' : 'Open quotation'}
          </Button>
          {allowDecision && (
            <>
              <Button size="sm" onClick={() => decide(q, 'recommended')} disabled={busy === q.id}>
                {busy === q.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Recommend for approval
              </Button>
              <Button variant="secondary" size="sm" onClick={() => decide(q, 'revision_requested')} disabled={busy === q.id}>
                <RefreshCw className="h-4 w-4 mr-1" /> Request revision
              </Button>
              <Button variant="destructive" size="sm" onClick={() => decide(q, 'rejected_procurement')} disabled={busy === q.id}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </>
          )}
        </div>

        {allowDecision && (
          <div>
            <Label className="text-xs">Review note (kept on the record)</Label>
            <Textarea
              rows={2}
              value={notes[q.id] || ''}
              onChange={(e) => setNotes((n) => ({ ...n, [q.id]: e.target.value }))}
              placeholder="e.g. Prices are above market; ask for a revision."
            />
          </div>
        )}

        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            <QuotationViewer path={q.file_path} name={q.file_name} />
            <QuotationReplyBox
              quotationId={q.id}
              companyEmail={q.email}
              companyPhone={q.phone}
              defaultSubject={`Your quotation — ${q.subject}`}
              notify={notifyCompany}
            />
            {history.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Replies sent</p>
                {history.map((m) => (
                  <div key={m.id} className="text-xs rounded border p-2">
                    <span className="inline-flex items-center gap-1 font-medium">
                      {m.channel === 'email' ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                      {m.channel === 'email' ? 'Email' : 'Text'} · {m.status}
                    </span>
                    <span className="text-muted-foreground"> · {new Date(m.created_at).toLocaleString()} · {m.sent_by}</span>
                    <p className="mt-1">{m.body}</p>
                    {m.error && <p className="text-destructive mt-1">{m.error}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Quotations</CardTitle>
          <CardDescription>Review company quotations, reply by email or text, then send them for management approval.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4" /></Button>
          <QuotationFormDialog onCreate={createQuotation} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">To review ({pending.length})</TabsTrigger>
              <TabsTrigger value="all">Reviewed ({decided.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="space-y-3 mt-4">
              {pending.length === 0
                ? <p className="text-sm text-muted-foreground py-6 text-center">No quotations waiting for review.</p>
                : pending.map((q) => renderCard(q, true))}
            </TabsContent>
            <TabsContent value="all" className="space-y-3 mt-4">
              {decided.length === 0
                ? <p className="text-sm text-muted-foreground py-6 text-center">Nothing reviewed yet.</p>
                : decided.map((q) => renderCard(q, false))}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default QuotationReviewPanel;
