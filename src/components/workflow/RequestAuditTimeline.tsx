import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Event = { at: string; who?: string | null; what: string; note?: string | null; tone?: 'ok' | 'bad' | 'info' };

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('en-GB', { timeZone: 'Africa/Kampala' }) : '');
const money = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;

export const buildRequestEvents = (r: any, logs: any[]): Event[] => {
  const ev: Event[] = [];
  if (!r) return ev;
  ev.push({ at: r.created_at, who: r.requestedby_name || r.requestedby, what: `Submitted ${r.type || 'request'} for ${money(r.amount)}`, note: [r.requestedby_position, r.department].filter(Boolean).join(' · ') || null, tone: 'info' });
  if (r.admin_approved_1_at) ev.push({ at: r.admin_approved_1_at, who: r.admin_approved_1_by, what: 'First Admin approval', tone: 'ok' });
  if (r.admin_approved_2_at) ev.push({ at: r.admin_approved_2_at, who: r.admin_approved_2_by, what: 'Second Admin approval', tone: 'ok' });
  if (r.admin_approved_at && r.admin_approved_at !== r.admin_approved_1_at) ev.push({ at: r.admin_approved_at, who: r.admin_approved_by, what: 'Admin approved', note: r.admin_comments, tone: 'ok' });
  if (r.finance_review_at) ev.push({ at: r.finance_review_at, who: r.finance_review_by, what: 'Finance reviewed', tone: 'info' });
  if (r.finance_approved_at) ev.push({ at: r.finance_approved_at, who: r.finance_approved_by, what: `Finance approved${r.payment_method ? ` (${r.payment_method})` : ''}`, tone: 'ok' });
  if (r.admin_final_approval_at) ev.push({ at: r.admin_final_approval_at, who: r.admin_final_approval_by, what: 'Final Admin approval', tone: 'ok' });
  if (r.payout_attempted_at) ev.push({ at: r.payout_attempted_at, what: `Payment sent via ${r.payout_provider || 'provider'}${r.payout_phone ? ` to ${r.payout_phone}` : ''}`, note: r.payout_ref ? `Reference ${r.payout_ref}` : null, tone: 'info' });
  if (r.payout_error) ev.push({ at: r.payout_attempted_at || r.updated_at, what: 'Payment failed', note: r.payout_error, tone: 'bad' });
  if (r.payout_completed_at) ev.push({ at: r.payout_completed_at, what: 'Money released to recipient', note: r.payout_ref ? `Reference ${r.payout_ref}` : null, tone: 'ok' });
  if ((r.status || '').toLowerCase() === 'rejected') ev.push({ at: r.updated_at, what: 'Rejected', note: r.rejection_reason || r.rejection_comments, tone: 'bad' });
  for (const l of logs) ev.push({ at: l.created_at, who: l.performed_by, what: String(l.action || '').replace(/_/g, ' ').toLowerCase(), note: l.reason, tone: 'info' });
  return ev.filter(e => e.at).sort((a, b) => +new Date(a.at) - +new Date(b.at));
};

export const RequestAuditTimeline: React.FC<{ requestId: string }> = ({ requestId }) => {
  const [req, setReq] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true); setError(null);
      const [r, l] = await Promise.all([
        supabase.from('approval_requests').select('*').eq('id', requestId).maybeSingle(),
        supabase.from('audit_logs').select('action, reason, performed_by, created_at').eq('record_id', requestId).order('created_at'),
      ]);
      if (!live) return;
      if (r.error) setError(r.error.message);
      setReq(r.data); setLogs(l.data || []); setLoading(false);
    })();
    return () => { live = false; };
  }, [requestId]);

  const events = buildRequestEvents(req, logs);
  const d = req?.details || {};
  return (
    <Card className="print:border print:border-gray-300">
      <CardHeader><CardTitle className="text-lg">Request history</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Loading history…</p>}
        {error && <p className="text-sm text-destructive">Could not load the history: {error}</p>}
        {!loading && !error && !req && <p className="text-sm text-muted-foreground">This request could not be found.</p>}
        {req && (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground">Requested by</p><p className="font-medium">{req.requestedby_name || req.requestedby}</p></div>
              <div><p className="text-muted-foreground">Amount</p><p className="font-medium">{money(req.amount)}</p></div>
              <div><p className="text-muted-foreground">Current status</p><Badge variant="outline">{req.status}{req.approval_stage ? ` · ${req.approval_stage}` : ''}</Badge></div>
              <div><p className="text-muted-foreground">Pay to</p><p className="font-medium">{[req.disbursement_method, req.disbursement_phone || d.phoneNumber || d.phone, req.disbursement_bank_name, req.disbursement_account_number].filter(Boolean).join(' · ') || '—'}</p></div>
              {req.payout_status && <div><p className="text-muted-foreground">Payment status</p><p className="font-medium">{req.payout_status}</p></div>}
              {req.payout_ref && <div><p className="text-muted-foreground">Payment reference</p><p className="font-mono text-xs">{req.payout_ref}</p></div>}
            </div>
            <ol className="relative border-l border-border ml-2 space-y-3">
              {events.map((e, i) => (
                <li key={i} className="ml-4">
                  <span className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full ${e.tone === 'ok' ? 'bg-primary' : e.tone === 'bad' ? 'bg-destructive' : 'bg-muted-foreground'}`} />
                  <p className="text-xs text-muted-foreground">{fmt(e.at)}</p>
                  <p className="text-sm font-medium first-letter:uppercase">{e.what}{e.who ? ` — ${e.who}` : ''}</p>
                  {e.note && <p className="text-xs text-muted-foreground">{e.note}</p>}
                </li>
              ))}
            </ol>
          </>
        )}
      </CardContent>
    </Card>
  );
};
