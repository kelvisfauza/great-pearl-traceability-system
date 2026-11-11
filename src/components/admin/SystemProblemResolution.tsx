import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import SystemRedFlagsPanel from './SystemRedFlagsPanel';
import { classifyProblem, ESCALATION_EMAIL } from '../../../supabase/functions/_shared/problem-resolution-rules';

type Problem = { id: string; ticket_code: string; subject: string; message: string; category: string | null; status: string; created_at: string; metadata: Record<string, unknown> };

export default function SystemProblemResolution() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [area, setArea] = useState('General');
  const [priority, setPriority] = useState('medium');
  const [reportId, setReportId] = useState(() => crypto.randomUUID());
  const [selected, setSelected] = useState<Problem | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState('Not checked');
  const [filter, setFilter] = useState('active');
  const [page, setPage] = useState(0);
  const { data: access, isError: accessError, isLoading: accessLoading } = useQuery({ queryKey: ['problem-resolution-access'], queryFn: async () => {
    const { data, error } = await supabase.rpc('can_manage_system_red_flags');
    if (error) throw error;
    return data;
  } });
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['settings-problems', filter, page], enabled: access === true, refetchInterval: 30000, queryFn: async () => {
    let query = supabase.from('support_tickets').select('id,ticket_code,subject,message,category,status,created_at,metadata', { count: 'exact' }).eq('source', 'system_settings');
    if (filter === 'active') query = query.not('status', 'in', '(resolved,closed)');
    else if (filter === 'resolved') query = query.eq('status', 'resolved');
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(page * 20, page * 20 + 19);
    if (error) throw error;
    return { rows: (data || []) as unknown as Problem[], count: count || 0 };
  } });
  const diagnosis = classifyProblem(message);
  const invoke = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('system-problem-management', { body });
    if (error || !data?.ok) throw new Error(error?.message || data?.error || 'Action failed');
    return data;
  };
  const report = async () => {
    setBusy(true);
    try {
      const result = await invoke({ action: 'report', id: reportId, subject, message, area, priority });
      toast.success(`Problem saved: ${result.ticket_code}`);
      setSubject(''); setMessage(''); setReportId(crypto.randomUUID());
      await refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Problem could not be saved'); }
    finally { setBusy(false); }
  };
  const act = async (action: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      await invoke({ action, id: selected.id, note });
      toast.success(action === 'escalate' ? 'Escalation email confirmed' : action === 'resolve' ? 'Resolution recorded' : 'Investigation assigned to you');
      setSelected(null); setNote(''); await refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Action failed'); await refetch(); }
    finally { setBusy(false); }
  };
  const checkConnection = async () => {
    setBusy(true); setCheck('Checking…');
    try {
      const { error } = await supabase.from('support_tickets').select('id').limit(1).abortSignal(AbortSignal.timeout(15000));
      if (error) throw error;
      setCheck(`Connection and ticket access OK · ${new Date().toLocaleTimeString()}`);
    } catch { setCheck('Connection or access check failed. Retry or escalate; no records changed.'); }
    finally { setBusy(false); }
  };
  if (accessError) return <p role="alert" className="text-destructive">Administrator access could not be checked. Reopen Settings to retry.</p>;
  if (accessLoading) return <p role="status">Checking access…</p>;
  if (!access) return <p>Administrator access required.</p>;
  return <div className="space-y-7 min-w-0">
    <section className="space-y-4 border-b pb-6">
      <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h3 className="text-lg font-semibold">Checks & recovery</h3></div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={checkConnection} disabled={busy}><RefreshCw className="mr-2 h-4 w-4" />Check connection</Button>
        <Button variant="outline" onClick={() => refetch()} disabled={busy || isLoading}><RefreshCw className="mr-2 h-4 w-4" />Reload problems</Button>
        <Button variant="outline" asChild><Link to="/admin/payout-status">Review payout status</Link></Button>
        <Button variant="outline" asChild><Link to="/admin/system-settings?tool=permissions">Review staff access</Link></Button>
        <Button variant="outline" asChild><Link to="/admin/system-settings?tool=backup">Open backups</Link></Button>
      </div>
      <p role="status" className="text-sm text-muted-foreground">{check}</p>
      <p className="text-sm text-muted-foreground">Checks do not resend payments, change balances or bypass approvals.</p>
    </section>
    <section className="space-y-4 border-b pb-6">
      <h3 className="text-lg font-semibold flex items-center gap-2"><AlertCircle className="h-5 w-5 text-primary" />Report a problem</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2"><Label htmlFor="problem-subject">Problem title</Label><Input id="problem-subject" value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} /></div>
        <div className="space-y-2"><Label htmlFor="problem-area">Affected area</Label><Input id="problem-area" value={area} onChange={e => setArea(e.target.value)} maxLength={120} /></div>
      </div>
      <div className="space-y-2"><Label htmlFor="problem-message">What happened / error shown</Label><Textarea id="problem-message" value={message} onChange={e => setMessage(e.target.value)} maxLength={4000} rows={4} /><p className="text-xs text-muted-foreground">Do not include passwords, sign-in codes or secret keys.</p></div>
      {message.trim() && <div role="status" className="bg-muted rounded-md p-3 space-y-1"><Badge variant={diagnosis.kind === 'code' ? 'destructive' : 'secondary'}>{diagnosis.label}</Badge><p className="text-sm">{diagnosis.action}</p><p className="text-xs text-muted-foreground">Suggested assessment only; the cause is not confirmed.</p></div>}
      <div className="flex flex-wrap gap-3"><Select value={priority} onValueChange={setPriority}><SelectTrigger className="w-40" aria-label="Problem priority"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="medium">Normal</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select><Button disabled={busy || subject.trim().length < 3 || message.trim().length < 5 || !area.trim()} onClick={report}>Save problem</Button></div>
    </section>
    <section className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><h3 className="text-lg font-semibold">Reported problems <Badge variant="secondary">{data?.count ?? '—'}</Badge></h3><Select value={filter} onValueChange={v => { setFilter(v); setPage(0); }}><SelectTrigger className="w-40" aria-label="Problem status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="all">All</SelectItem></SelectContent></Select></div>
      {error ? <p role="alert" className="text-destructive">Problems could not be loaded. <Button variant="link" onClick={() => refetch()}>Retry</Button></p> : isLoading ? <p>Loading problems…</p> : !data?.rows.length ? <p className="text-muted-foreground text-sm">No problems in this view.</p> : <div className="divide-y">{data.rows.map(p => <div key={p.id} className="py-3 flex flex-col sm:flex-row justify-between gap-3"><div className="min-w-0 space-y-1"><p className="font-medium break-words">{p.subject}</p><p className="text-xs text-muted-foreground break-words">{p.ticket_code} · {p.category} · {p.status} · {new Date(p.created_at).toLocaleDateString('en-GB')}</p><div className="flex flex-wrap gap-2"><Badge variant="outline">{classifyProblem(p.message).label}</Badge>{p.metadata.escalation_status ? <Badge variant={p.metadata.escalation_status === 'failed' ? 'destructive' : 'secondary'}>Email: {String(p.metadata.escalation_status)}</Badge> : null}</div></div><Button variant="outline" size="sm" onClick={() => { setSelected(p); setNote(''); }}>Review</Button></div>)}</div>}
      <div className="flex justify-between gap-2"><Button size="sm" variant="ghost" disabled={!page} onClick={() => setPage(p => p - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {page + 1}</span><Button size="sm" variant="ghost" disabled={(page + 1) * 20 >= (data?.count || 0)} onClick={() => setPage(p => p + 1)}>Next</Button></div>
      {selected && <section className="border-y py-5 space-y-3" aria-label="Problem review"><div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold break-words">{selected.ticket_code} · {selected.subject}</h4><Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Close review</Button></div><p className="whitespace-pre-wrap break-words text-sm">{selected.message}</p><p className="text-sm text-muted-foreground">{classifyProblem(selected.message).action}</p>{selected.metadata.last_note ? <p className="text-sm break-words">Last review: {String(selected.metadata.last_note)}</p> : null}<Label htmlFor="problem-note">Review note / confirmed resolution</Label><Textarea id="problem-note" value={note} onChange={e => setNote(e.target.value)} maxLength={2000} /><p className="text-xs text-muted-foreground break-all">Escalation recipient: {ESCALATION_EMAIL}</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || note.trim().length < 5 || selected.status === 'resolved'} onClick={() => act('investigate')}>Take investigation</Button><Button disabled={busy || note.trim().length < 5} onClick={() => act('escalate')}><Send className="mr-2 h-4 w-4" />Escalate by email</Button><Button variant="outline" disabled={busy || note.trim().length < 5 || selected.status === 'resolved'} onClick={() => act('resolve')}><CheckCircle2 className="mr-2 h-4 w-4" />Record resolution</Button></div></section>}
    </section>
    <SystemRedFlagsPanel />
  </div>;
}