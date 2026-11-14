import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, X, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { PerDiemRequest } from '@/lib/perDiemRequests';

export default function PerDiemRequestApprovals() {
  const { employee } = useAuth();
  const client = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['admin-per-diem-requests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('per_diem_requests').select('*')
        .eq('status', 'pending').is('approved_at', null).order('submitted_at');
      if (error) throw error;
      return data as unknown as PerDiemRequest[];
    },
    refetchInterval: 15000,
  });
  const review = async (id: string, approve: boolean) => {
    setBusy(id);
    try {
      const { error } = await supabase.rpc('review_per_diem_request', {
        p_id: id, p_approve: approve, p_reason: approve ? undefined : reason.trim(),
      });
      if (error) throw error;
      await Promise.all([
        client.invalidateQueries({ queryKey: ['admin-per-diem-requests'] }),
        client.invalidateQueries({ queryKey: ['pending-per-diem-requests'] }),
        client.invalidateQueries({ queryKey: ['my-per-diem-requests'] }),
      ]);
      setRejectId(null);
      setReason('');
      toast({ title: approve ? 'Per diem approved' : 'Per diem rejected',
        description: approve ? 'The request can now proceed to award.' : 'The request cannot proceed to award.' });
    } catch (e) {
      toast({ title: 'Decision not saved', description: (e as { message?: string }).message, variant: 'destructive' });
    } finally { setBusy(null); }
  };
  return <section className="space-y-3">
    <div className="flex items-center justify-between gap-2 border-b pb-2">
      <h3 className="font-semibold">Employee per diem requests</h3>
      <div className="flex items-center gap-2"><Badge variant="outline">{data?.length ?? 0} awaiting approval</Badge>
        <Button variant="ghost" size="icon" aria-label="Refresh per diem requests" title="Refresh per diem requests" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button></div>
    </div>
    {isLoading && <p className="text-sm text-muted-foreground">Loading requests…</p>}
    {error && <p className="text-sm text-destructive">Unable to load per diem requests. Please retry.</p>}
    {!isLoading && !error && data?.length === 0 && <p className="text-sm text-muted-foreground">No per diem requests awaiting Admin approval.</p>}
    {data?.map(r => {
      const own = r.employee_id === employee?.id || r.employee_email.toLowerCase() === employee?.email?.toLowerCase();
      return <article key={r.id} className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap justify-between gap-2"><div><h4 className="font-medium">{r.employee_name}</h4><p className="text-xs font-mono text-muted-foreground break-all">{r.document_number}</p></div><strong>UGX {Number(r.amount).toLocaleString()}</strong></div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Purpose</dt><dd className="break-words">{r.form_data.purpose}</dd></div>
          <div><dt className="text-muted-foreground">Destination</dt><dd className="break-words">{r.form_data.destination}</dd></div>
          <div><dt className="text-muted-foreground">Dates</dt><dd>{r.form_data.startDate} — {r.form_data.endDate}</dd></div>
          <div><dt className="text-muted-foreground">Days / daily rate</dt><dd>{r.form_data.days} / UGX {Number(r.form_data.ratePerDay).toLocaleString()}</dd></div>
        </dl>
        {own ? <p className="text-sm text-muted-foreground">Another administrator must review your request.</p> : <>
          {rejectId === r.id && <div className="space-y-2"><Label htmlFor={`reject-${r.id}`}>Reason for rejection</Label><Textarea id={`reject-${r.id}`} value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} /></div>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy !== null} onClick={() => review(r.id, true)} className="gap-2"><Check className="h-4 w-4" />Approve</Button>
            <Button variant="destructive" disabled={busy !== null || (rejectId === r.id && !reason.trim())} onClick={() => rejectId === r.id ? review(r.id, false) : (setRejectId(r.id), setReason(''))} className="gap-2"><X className="h-4 w-4" />{rejectId === r.id ? 'Confirm rejection' : 'Reject'}</Button>
            {rejectId === r.id && <Button variant="ghost" disabled={busy !== null} onClick={() => setRejectId(null)}>Cancel</Button>}
          </div>
        </>}
      </article>;
    })}
  </section>;
}