import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DisbursePaymentModal, DisburseTarget } from './DisbursePaymentModal';

type Row = {
  id: string;
  title: string;
  type: string;
  amount: number;
  payout_status: string | null;
  payout_error: string | null;
  disbursement_phone: string | null;
  requestedby_name: string | null;
  details: any;
};

export const AwaitingDisbursementPanel: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<DisburseTarget | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('approval_requests')
      .select('id, title, type, amount, payout_status, payout_error, disbursement_phone, requestedby_name, details')
      .eq('status', 'Approved')
      .or('payout_status.is.null,payout_status.in.(pending,failed)')
      // Salary advances are credited directly to the employee wallet by the
      // auto-disbursement trigger, so they never need a manual payout release.
      .not('type', 'in', '("Salary Advance","salary_advance")')
      .order('updated_at', { ascending: false })
      .limit(20);
    setRows((data || []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!loading && rows.length === 0) return null;

  return (
    <>
      <Card className="border-emerald-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-emerald-600" />
              Awaiting Disbursement ({rows.length})
            </CardTitle>
            <CardDescription>Fully approved requests where the money has not been released yet</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((r) => {
            const phone = r.disbursement_phone || r.details?.beneficiary_phone || r.details?.recipient_phone || r.details?.phone || '';
            const name = r.details?.beneficiary_name || r.details?.recipient_name || r.requestedby_name || 'Recipient';
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3 border rounded-lg">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {name}{phone ? ` • ${phone}` : ''} • UGX {Number(r.amount).toLocaleString()}
                  </p>
                  {r.payout_error && <p className="text-xs text-destructive">Last error: {r.payout_error}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {r.payout_status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setTarget({ requestId: r.id, title: r.title, amount: Number(r.amount), phone, recipientName: name })}
                  >
                    <Send className="h-4 w-4 mr-1" /> Release Payment
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <DisbursePaymentModal target={target} onClose={() => setTarget(null)} onDone={load} />
    </>
  );
};

export default AwaitingDisbursementPanel;
