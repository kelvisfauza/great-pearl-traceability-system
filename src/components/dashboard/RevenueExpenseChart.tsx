import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign } from 'lucide-react';

const RevenueExpenseChart = () => {
  const [monthData, setMonthData] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const now = new Date();
      // Last 6 months
      const data: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        data.push({
          month: start.toLocaleDateString('en-US', { month: 'short' }),
          startISO: start.toISOString(),
          endISO: end.toISOString(),
          Revenue: 0,
          Expenses: 0,
        });
      }

      const [{ data: txs }, { data: exps }] = await Promise.all([
        supabase.from('finance_cash_transactions').select('amount, transaction_type, created_at')
          .gte('created_at', data[0].startISO).lte('created_at', data[data.length - 1].endISO),
        supabase.from('finance_expenses').select('amount, created_at')
          .gte('created_at', data[0].startISO).lte('created_at', data[data.length - 1].endISO),
      ]);

      txs?.forEach(t => {
        const d = new Date(t.created_at);
        const idx = data.findIndex(m => {
          const s = new Date(m.startISO);
          const e = new Date(m.endISO);
          return d >= s && d <= e;
        });
        if (idx >= 0 && (t.transaction_type === 'cash_in' || t.transaction_type === 'revenue')) {
          data[idx].Revenue += Number(t.amount) || 0;
        }
      });

      exps?.forEach(e => {
        const d = new Date(e.created_at);
        const idx = data.findIndex(m => {
          const s = new Date(m.startISO);
          const en = new Date(m.endISO);
          return d >= s && d <= en;
        });
        if (idx >= 0) data[idx].Expenses += Number(e.amount) || 0;
      });

      // Convert to millions
      setMonthData(data.map(d => ({
        month: d.month,
        Revenue: Math.round(d.Revenue / 1000000 * 10) / 10,
        Expenses: Math.round(d.Expenses / 1000000 * 10) / 10,
      })));
    };
    fetch();
  }, []);

  return (
    <Card className="border-border/40 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-success via-chart-4 to-destructive" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-success/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-success" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Revenue vs Expenses</CardTitle>
              <p className="text-[10px] text-muted-foreground">6-month financial trend (UGX millions)</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">UGX M</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value}M UGX`, undefined]}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Area type="monotone" dataKey="Revenue" stroke="hsl(var(--success))" fill="url(#revenueGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="Expenses" stroke="hsl(var(--destructive))" fill="url(#expenseGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default RevenueExpenseChart;
