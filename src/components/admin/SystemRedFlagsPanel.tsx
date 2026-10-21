import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, RefreshCw, ArrowUpRight, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

type Flag = {
  id: string; department: string; severity: string; title: string;
  details: Record<string, unknown>; review_path: string; status: string;
  assigned_to: string | null; review_notes: string | null;
  first_detected_at: string; last_detected_at: string;
};

export default function SystemRedFlagsPanel() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Flag | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const { data: allowed, isError: accessError } = useQuery({
    queryKey: ['red-flags-access', user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('can_manage_system_red_flags');
      if (error) throw error;
      return data;
    },
  });
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['system-red-flags', department, status, page], enabled: allowed === true,
    queryFn: async () => {
      let query = supabase.from('system_red_flags').select('*', { count: 'exact' });
      if (status === 'active') query = query.neq('status', 'resolved');
      else query = query.eq('status', status);
      if (department !== 'all') query = query.eq('department', department);
      const { data, error, count } = await query.order('first_detected_at', { ascending: false }).range(page * 25, page * 25 + 24);
      if (error) throw error;
      return { rows: (data || []) as unknown as Flag[], count: count || 0 };
    }, refetchInterval: 60000,
  });
  const refresh = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('scan_system_red_flags');
      if (error) throw error;
      await client.invalidateQueries({ queryKey: ['system-red-flags'] });
      toast.success('System check completed');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'System check failed'); }
    finally { setBusy(false); }
  };
  const save = async (claim: boolean) => {
    if (!selected) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('review_system_red_flag', { p_id: selected.id, p_notes: notes, p_claim: claim });
      if (error) throw error;
      const result = data as { ok?: boolean; error?: string };
      if (!result.ok) throw new Error(result.error || 'Could not save review');
      await client.invalidateQueries({ queryKey: ['system-red-flags'] });
      setSelected(null);
      toast.success(claim ? 'Task assigned to you' : 'Review note saved');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save review'); }
    finally { setBusy(false); }
  };
  if (accessError) return <p className="text-destructive">Unable to verify red-flag access.</p>;
  if (!allowed) return null;
  const rows = (data?.rows || []).filter(f => JSON.stringify(f).toLowerCase().includes(search.toLowerCase()));
  const editable = selected?.status !== 'resolved' && (!selected?.assigned_to || selected.assigned_to === user?.id);
  return (
    <section className="space-y-4 border-y py-5" aria-label="System red flags">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle className="h-5 w-5 text-destructive" />System red flags <Badge variant="destructive">{data?.count ?? '—'}</Badge></h2>
        <Button variant="outline" size="sm" onClick={refresh} disabled={busy}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Check now</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={department} onValueChange={v => { setDepartment(v); setPage(0); }}><SelectTrigger className="w-44" aria-label="Department"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All departments</SelectItem>{['Quality', 'Store', 'Procurement', 'Finance', 'Inventory', 'Treasury'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
        <Select value={status} onValueChange={v => { setStatus(v); setPage(0); }}><SelectTrigger className="w-40" aria-label="Task status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active tasks</SelectItem><SelectItem value="open">Unclaimed</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent></Select>
        <Input className="w-full sm:w-64" placeholder="Search this page" aria-label="Search red flags" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {error ? <div className="text-destructive">Red flags could not be loaded. <Button variant="link" onClick={() => refetch()}>Retry</Button></div> : isLoading ? <p className="text-muted-foreground">Loading tasks…</p> : rows.length === 0 ? <p className="text-muted-foreground">No tasks match this view.</p> : <div className="divide-y">{rows.map(f => <div key={f.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
        <div className="min-w-0 space-y-1"><div className="flex flex-wrap gap-2"><Badge variant={f.severity === 'critical' ? 'destructive' : 'outline'}>{f.severity}</Badge><Badge variant="secondary">{f.department}</Badge><span className="text-xs text-muted-foreground">{f.status === 'in_progress' ? 'In progress' : f.status === 'resolved' ? 'Resolved' : 'Needs review'}{f.assigned_to === user?.id ? ' · Assigned to you' : f.assigned_to ? ' · Assigned to another admin' : ''}</span></div><p className="text-sm font-medium break-words">{f.title}</p><p className="text-xs text-muted-foreground break-words">{String(f.details.form_number || f.details.batch || f.details.supplier || f.details.reference || '')} · Detected {new Date(f.first_detected_at).toLocaleDateString('en-GB')}</p></div>
        <Button variant="outline" size="sm" onClick={() => { setSelected(f); setNotes(f.review_notes || ''); }}>Review task</Button>
      </div>)}</div>}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>Page {page + 1} · {data?.count || 0} tasks</span><div className="flex gap-2"><Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button><Button size="sm" variant="ghost" disabled={(page + 1) * 25 >= (data?.count || 0)} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>
      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{selected?.title}</DialogTitle></DialogHeader>
        <p className="text-sm">{String(selected?.details.action || '')}</p>
        <dl className="space-y-2 text-sm">{Object.entries(selected?.details || {}).filter(([k]) => k !== 'action').map(([key, value]) => <div key={key}><dt className="font-medium capitalize">{key.replace(/_/g, ' ')}</dt><dd className="text-muted-foreground break-all whitespace-pre-wrap">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? 'Not recorded')}</dd></div>)}</dl>
        <label htmlFor="flag-notes" className="text-sm font-medium">Review notes</label><Textarea id="flag-notes" value={notes} onChange={e => setNotes(e.target.value)} disabled={!editable} />
        <div className="flex flex-wrap gap-2"><Button disabled={busy || !editable} onClick={() => save(true)}><UserCheck className="mr-2 h-4 w-4" />Take task</Button><Button variant="outline" disabled={busy || !editable} onClick={() => save(false)}>Save note</Button><Button variant="outline" asChild><Link to={selected?.review_path || '/'}>Open department<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button></div>
      </DialogContent></Dialog>
    </section>
  );
}