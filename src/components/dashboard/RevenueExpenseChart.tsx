import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign } from 'lucide-react';

const RevenueExpenseChart = () => {
  const [monthData, setMonthData] = useState<any[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, expenses: 0, profit: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const data: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        data.push({ month: start.toLocaleDateString('en-US', { month: 'short' }), startISO: start.toISOString(), endISO: end.toISOString(), Revenue: 0, Expenses: 0 });
      }

      const [{ data: txs }, { data: exps }] = await Promise.all([
        supabase.from('finance_cash_transactions').select('amount, transaction_type, created_at').gte('created_at', data[0].startISO).lte('created_at', data[data.length - 1].endISO),
        supabase.from('finance_expenses').select('amount, created_at').gte('created_at', data[0].startISO).lte('created_at', data[data.length - 1].endISO),
      ]);

      txs?.forEach(t => {
        const d = new Date(t.created_at);
        const idx = data.findIndex(m => d >= new Date(m.startISO) && d <= new Date(m.endISO));
        if (idx >= 0 && (t.transaction_type === 'cash_in' || t.transaction_type === 'revenue')) data[idx].Revenue += Number(t.amount) || 0;
      });
      exps?.forEach(e => {
        const d = new Date(e.created_at);
        const idx = data.findIndex(m => d >= new Date(m.startISO) && d <= new Date(m.endISO));
        if (idx >= 0) data[idx].Expenses += Number(e.amount) || 0;
      });

      const totalRev = data.reduce((s, d) => s + d.Revenue, 0);
      const totalExp = data.reduce((s, d) => s + d.Expenses, 0);
      setTotals({ revenue: totalRev, expenses: totalExp, profit: totalRev - totalExp });

      setMonthData(data.map(d => ({
        month: d.month,
        Revenue: Math.round(d.Revenue / 1000000 * 10) / 10,
        Expenses: Math.round(d.Expenses / 1000000 * 10) / 10,
      })));
    };
    fetchData();
  }, []);

  const fmt = (v: number) => `${(v / 1000000).toFixed(1)}M`;

  return (
    <Card className="border-border/30 overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-success to-destructive" />
      <CardHeader className="pb-0 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-success/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-success" />
            </div>
            <CardTitle className="text-sm font-bold">Financial Overview</CardTitle>
          </div>
          <Badge variant="outline" className="text-[9px] font-mono">6 months</Badge>
        </div>
        {/* Summary pills */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1 rounded-lg bg-success/5 border border-success/10 p-2.5 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Revenue</p>
            <p className="text-sm font-black text-success">UGX {fmt(totals.revenue)}</p>
          </div>
          <div className="flex-1 rounded-lg bg-destructive/5 border border-destructive/10 p-2.5 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Expenses</p>
            <p className="text-sm font-black text-destructive">UGX {fmt(totals.expenses)}</p>
          </div>
          <div className="flex-1 rounded-lg bg-primary/5 border border-primary/10 p-2.5 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Net</p>
            <p className={`text-sm font-black ${totals.profit >= 0 ? 'text-success' : 'text-destructive'}`}>UGX {fmt(totals.profit)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={monthData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.25} />
                <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.15} />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} formatter={(v: number) => [`${v}M UGX`]} />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
            <Area type="monotone" dataKey="Revenue" stroke="hsl(var(--success))" fill="url(#revGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="Expenses" stroke="hsl(var(--destructive))" fill="url(#expGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default RevenueExpenseChart;
