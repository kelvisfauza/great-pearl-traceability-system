import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, RefreshCw, Send } from 'lucide-react';

type Ticket = {
  id: string; ticket_code: string; customer_name: string; customer_email: string;
  customer_phone: string | null; subject: string; message: string;
  category: string | null; priority: string; status: string;
  created_at: string; updated_at: string;
};
type Reply = {
  id: string; ticket_id: string; author_type: string; author_name: string;
  author_email: string | null; message: string; is_internal_note: boolean; created_at: string;
};

const priorityColor: Record<string, string> = {
  low: 'bg-slate-200 text-slate-800', medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800', urgent: 'bg-red-100 text-red-800',
};
const statusColor: Record<string, string> = {
  open: 'bg-green-100 text-green-800', 'in-progress': 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-blue-100 text-blue-800', closed: 'bg-slate-200 text-slate-700',
};

export default function SupportTickets() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('support_tickets')
      .select('*').order('created_at', { ascending: false }).limit(500);
    setTickets((data as Ticket[]) || []);
    setLoading(false);
  };

  const loadReplies = async (t: Ticket) => {
    const { data } = await supabase.from('support_ticket_replies')
      .select('*').eq('ticket_id', t.id).order('created_at', { ascending: true });
    setReplies((data as Reply[]) || []);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = supabase.channel('support-tickets-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket_replies' }, () => {
        if (selected) loadReplies(selected);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected?.id]);

  useEffect(() => {
    if (selected) { loadReplies(selected); setNewStatus(selected.status); }
  }, [selected?.id]);

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (filter !== 'all' && t.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.ticket_code.toLowerCase().includes(q)
          || t.customer_name.toLowerCase().includes(q)
          || t.customer_email.toLowerCase().includes(q)
          || t.subject.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tickets, filter, search]);

  const counts = useMemo(() => ({
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    'in-progress': tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  }), [tickets]);

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('reply-support-ticket', {
        body: {
          ticket_id: selected.id,
          message: reply.trim(),
          is_internal_note: internal,
          new_status: newStatus !== selected.status ? newStatus : undefined,
        },
      });
      if (error) throw error;
      const p = data as { ok: boolean; error?: string };
      if (!p.ok) throw new Error(p.error || 'Failed');
      toast({ title: internal ? 'Internal note added' : 'Reply sent to customer' });
      setReply(''); setInternal(false);
      loadReplies(selected); load();
    } catch (e) {
      toast({ title: 'Send failed', description: (e as Error).message, variant: 'destructive' });
    } finally { setSending(false); }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="h-6 w-6" /> Customer Support Inbox</h1>
          <p className="text-sm text-muted-foreground">Tickets submitted via the public support form at /support</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        {/* List */}
        <Card className="h-[calc(100vh-160px)] flex flex-col">
          <CardHeader className="pb-3 space-y-3">
            <Input placeholder="Search ID, name, email, subject…" value={search} onChange={e => setSearch(e.target.value)} />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({counts.all})</SelectItem>
                <SelectItem value="open">Open ({counts.open})</SelectItem>
                <SelectItem value="in-progress">In progress ({counts['in-progress']})</SelectItem>
                <SelectItem value="resolved">Resolved ({counts.resolved})</SelectItem>
                <SelectItem value="closed">Closed ({counts.closed})</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {loading ? (
              <div className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No tickets</div>
            ) : filtered.map(t => (
              <button key={t.id} onClick={() => setSelected(t)}
                className={`w-full text-left border-b px-4 py-3 hover:bg-muted/50 ${selected?.id === t.id ? 'bg-muted' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{t.ticket_code}</span>
                  <Badge className={statusColor[t.status]} variant="secondary">{t.status}</Badge>
                </div>
                <div className="font-medium text-sm truncate mt-1">{t.subject}</div>
                <div className="text-xs text-muted-foreground truncate">{t.customer_name} · {t.customer_email}</div>
                <div className="flex items-center justify-between mt-1">
                  <Badge className={priorityColor[t.priority]} variant="secondary">{t.priority}</Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Detail */}
        <Card className="h-[calc(100vh-160px)] flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a ticket to view the conversation
            </div>
          ) : (
            <>
              <CardHeader className="border-b">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">{selected.ticket_code}</span>
                      <Badge className={statusColor[selected.status]} variant="secondary">{selected.status}</Badge>
                      <Badge className={priorityColor[selected.priority]} variant="secondary">{selected.priority}</Badge>
                      {selected.category && <Badge variant="outline">{selected.category}</Badge>}
                    </div>
                    <CardTitle className="text-lg">{selected.subject}</CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                      From <b>{selected.customer_name}</b> &lt;{selected.customer_email}&gt;
                      {selected.customer_phone && <> · {selected.customer_phone}</>}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto space-y-3 py-4">
                <div className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span><b>{selected.customer_name}</b> (customer)</span>
                    <span>{new Date(selected.created_at).toLocaleString()}</span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm">{selected.message}</div>
                </div>
                {replies.map(r => (
                  <div key={r.id} className={`border rounded-lg p-3 ${r.is_internal_note ? 'bg-amber-50 border-amber-200' : r.author_type === 'admin' ? 'bg-blue-50/50 border-blue-200' : 'bg-muted/30'}`}>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>
                        <b>{r.author_name}</b> ({r.author_type})
                        {r.is_internal_note && <Badge variant="outline" className="ml-2 text-amber-700 border-amber-400">Internal note</Badge>}
                      </span>
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm">{r.message}</div>
                  </div>
                ))}
              </CardContent>
              <div className="border-t p-4 space-y-2">
                <Textarea rows={4} placeholder="Type your reply to the customer…" value={reply} onChange={e => setReply(e.target.value)} />
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={internal} onCheckedChange={v => setInternal(!!v)} />
                      Internal note (don't email customer)
                    </label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in-progress">In progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={sendReply} disabled={sending || !reply.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    {internal ? 'Add note' : 'Send reply'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}