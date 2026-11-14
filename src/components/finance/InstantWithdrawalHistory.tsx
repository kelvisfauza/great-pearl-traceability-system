import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

const labels: Record<string, string> = {
  success: 'Paid', completed: 'Paid', failed: 'Failed', rejected: 'Rejected', declined: 'Declined',
  pending_approval: 'Awaiting Admin', pending_finance: 'Awaiting Finance', pending: 'Awaiting payment confirmation', processing: 'Sending',
};
const date = (v: string | null) => v ? new Date(v).toLocaleString('en-UG', { timeZone: 'Africa/Kampala' }) : '—';
const money = (v: number) => `UGX ${Number(v).toLocaleString()}`;

export default function InstantWithdrawalHistory() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['finance-instant-withdrawal-history', page, search, status],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('finance-withdrawal-history', { body: { page, search, status } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Could not load withdrawal history.');
      return data as { withdrawals: any[]; total: number };
    },
    refetchInterval: 30000,
  });
  return <section className="space-y-4 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-lg font-semibold">Instant withdrawal history</h3>
      <Button variant="outline" size="icon" aria-label="Refresh withdrawal history" title="Refresh withdrawal history" onClick={() => refetch()} disabled={isFetching}>
        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
      </Button>
    </div>
    <div className="flex flex-wrap gap-2">
      <form className="flex flex-1 min-w-0 gap-2" onSubmit={e => { e.preventDefault(); setSearch(draft.trim()); setPage(0); }}>
        <Input aria-label="Search withdrawals" placeholder="Employee, phone or payment reference" value={draft} onChange={e => setDraft(e.target.value)} />
        <Button type="submit" variant="outline">Search</Button>
      </form>
      <Select value={status} onValueChange={v => { setStatus(v); setPage(0); }}>
        <SelectTrigger className="w-full sm:w-56" aria-label="Withdrawal status"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.entries(labels).map(([v, label]) => <SelectItem key={v} value={v}>{label}{v === 'completed' ? ' (legacy)' : ''}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    {isLoading ? <p className="text-sm text-muted-foreground">Loading withdrawal history…</p> : error ?
      <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error.message}</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div> :
      <>
        {!data?.withdrawals.length && <p className="text-sm text-muted-foreground">No withdrawals match this search.</p>}
        <div className="divide-y divide-border">
          {data?.withdrawals.map(w => <article key={w.id} className="py-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0"><p className="font-semibold break-words">{w.employee_name} — {money(w.amount)}</p><p className="text-xs text-muted-foreground">{date(w.created_at)} • {w.phone_number}</p></div>
              <div className="flex items-center gap-2">
                <Badge variant={['failed', 'rejected', 'declined'].includes(w.payout_status) ? 'destructive' : ['success', 'completed'].includes(w.payout_status) ? 'default' : 'secondary'}>{labels[w.payout_status] || w.payout_status}</Badge>
                <Button size="sm" variant="ghost" aria-expanded={expanded === w.id} onClick={() => setExpanded(expanded === w.id ? null : w.id)}>Details</Button>
              </div>
            </div>
            {expanded === w.id && <dl className="grid sm:grid-cols-2 gap-2 text-sm break-words">
              <div><dt className="text-muted-foreground">Payment reference</dt><dd className="break-all">{w.payout_ref || 'Not sent'}</dd></div>
              <div><dt className="text-muted-foreground">Payment method</dt><dd>{String(w.payout_ref || '').startsWith('CASH-') ? 'Cash' : w.payment_provider === 'gosente' ? 'GosentePay' : w.payment_provider === 'yo' ? 'Yo Payments' : w.payment_provider || 'Not recorded'}</dd></div>
              <div><dt className="text-muted-foreground">Admin approval</dt><dd>{w.admin_approved_by || 'Not recorded'} • {date(w.admin_approved_at)}</dd></div>
              <div><dt className="text-muted-foreground">Finance release</dt><dd>{w.finance_released_by || 'Not recorded'} • {date(w.finance_released_at)}</dd></div>
              <div><dt className="text-muted-foreground">Completed</dt><dd>{date(w.completed_at)}</dd></div>
              {w.last_error && <div className="text-destructive"><dt>Last reported problem</dt><dd>{w.last_error}</dd></div>}
            </dl>}
          </article>)}
        </div>
        {!!data?.total && <div className="flex justify-between items-center gap-2 text-sm">
          <span>{page * 50 + 1}–{Math.min((page + 1) * 50, data.total)} of {data.total}</span>
          <div className="flex gap-2"><Button variant="outline" size="icon" title="Previous page" aria-label="Previous page" disabled={page === 0 || isFetching} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" title="Next page" aria-label="Next page" disabled={(page + 1) * 50 >= data.total || isFetching} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button></div>
        </div>}
      </>}
  </section>;
}