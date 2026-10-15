import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const METHOD_LABEL: Record<string, string> = { gosentepay: 'GosentePay', yo: 'Yo Payments', mobile_money: 'Yo Payments', cash: 'Cash' };

export const FinanceOvertimePayments = () => {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ['finance-overtime-payments'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('monthly_overtime_reviews')
        .select('id, employee_name, month, year, calculated_pay, adjusted_pay, payout_method, payout_destination, payout_status, reviewed_by')
        .eq('status', 'approved')
        .in('payout_status', ['awaiting_finance', 'failed'])
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  if (!rows.length) return null;

  const release = async (r: any) => {
    setBusy(r.id);
    try {
      const { data, error } = await supabase.functions.invoke('process-overtime-payout', {
        body: { reviewId: r.id, payoutMethod: r.payout_method, action: 'finance_release' },
      });
      if (error) throw error;
      if ((data as any)?.ok === false) throw new Error((data as any).error);
      toast.success(`${r.employee_name} paid by ${METHOD_LABEL[r.payout_method] || r.payout_method}`);
    } catch (e: any) {
      toast.error(e.message || 'Payment failed');
    } finally {
      setBusy(null);
      qc.invalidateQueries({ queryKey: ['finance-overtime-payments'] });
    }
  };

  const total = rows.reduce((s: number, r: any) => s + Number(r.adjusted_pay ?? r.calculated_pay ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Overtime awaiting payment</CardTitle>
        <CardDescription>{rows.length} approved • UGX {total.toLocaleString()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r: any) => {
          const amt = Number(r.adjusted_pay ?? r.calculated_pay ?? 0);
          const method = METHOD_LABEL[r.payout_method] || r.payout_method;
          return (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div>
                <p className="font-medium">{r.employee_name} <span className="text-xs text-muted-foreground">{MONTHS[r.month]} {r.year}</span></p>
                <p className="text-xs text-muted-foreground">
                  UGX {amt.toLocaleString()} • {method}{r.payout_destination && r.payout_destination !== 'cash' ? ` to ${r.payout_destination}` : ''} • approved by {r.reviewed_by || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {r.payout_status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                <Button size="sm" disabled={busy === r.id} onClick={() => release(r)}>
                  {busy === r.id ? 'Paying…' : r.payout_method === 'cash' ? 'Mark paid in cash' : r.payout_status === 'failed' ? `Try again (${method})` : `Send via ${method}`}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
