import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from 'lucide-react';

interface DayData {
  label: string;
  coffee_kgs: number;
  bags: number;
  revenue: number;
  expenses: number;
  suppliers: number;
}

const DailyComparisonChart = () => {
  const [data, setData] = useState<{ today: DayData; yesterday: DayData; weekData: any[] }>({
    today: { label: 'Today', coffee_kgs: 0, bags: 0, revenue: 0, expenses: 0, suppliers: 0 },
    yesterday: { label: 'Yesterday', coffee_kgs: 0, bags: 0, revenue: 0, expenses: 0, suppliers: 0 },
    weekData: [],
  });

  useEffect(() => {
    const fetch = async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
      const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59).toISOString();

      // Fetch last 7 days for chart
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString();

      const [
        { data: todayCoffee },
        { data: yesterdayCoffee },
        { data: weekCoffee },
        { data: todayTx },
        { data: yesterdayTx },
      ] = await Promise.all([
        supabase.from('coffee_records').select('kilograms, bags').gte('date', todayStart.split('T')[0]).lte('date', todayEnd.split('T')[0]),
        supabase.from('coffee_records').select('kilograms, bags').gte('date', yesterdayStart.split('T')[0]).lte('date', yesterdayEnd.split('T')[0]),
        supabase.from('coffee_records').select('kilograms, bags, date').gte('date', sevenDaysAgo.split('T')[0]).lte('date', todayEnd.split('T')[0]),
        supabase.from('finance_cash_transactions').select('amount, transaction_type').gte('created_at', todayStart).lte('created_at', todayEnd),
        supabase.from('finance_cash_transactions').select('amount, transaction_type').gte('created_at', yesterdayStart).lte('created_at', yesterdayEnd),
      ]);

      const sumKgs = (records: any[]) => records?.reduce((s, r) => s + (Number(r.kilograms) || 0), 0) || 0;
      const sumBags = (records: any[]) => records?.reduce((s, r) => s + (Number(r.bags) || 0), 0) || 0;
      const sumRevenue = (records: any[]) => records?.filter(t => t.transaction_type === 'cash_in' || t.transaction_type === 'revenue').reduce((s, t) => s + (Number(t.amount) || 0), 0) || 0;

      // Build 7-day chart data
      const dayMap: Record<string, { kgs: number; bags: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dayMap[key] = { kgs: 0, bags: 0 };
      }
      weekCoffee?.forEach(r => {
        const key = r.date?.split('T')[0];
        if (key && dayMap[key]) {
          dayMap[key].kgs += Number(r.kilograms) || 0;
          dayMap[key].bags += Number(r.bags) || 0;
        }
      });

      const weekData = Object.entries(dayMap).map(([date, vals]) => ({
        name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        'Coffee (kg)': Math.round(vals.kgs),
        'Bags': vals.bags,
      }));

      setData({
        today: { label: 'Today', coffee_kgs: sumKgs(todayCoffee), bags: sumBags(todayCoffee), revenue: sumRevenue(todayTx), expenses: 0, suppliers: 0 },
        yesterday: { label: 'Yesterday', coffee_kgs: sumKgs(yesterdayCoffee), bags: sumBags(yesterdayCoffee), revenue: sumRevenue(yesterdayTx), expenses: 0, suppliers: 0 },
        weekData,
      });
    };
    fetch();
  }, []);

  const getChange = (today: number, yesterday: number) => {
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  };

  const comparisons = [
    { label: 'Coffee Purchased', today: data.today.coffee_kgs, yesterday: data.yesterday.coffee_kgs, unit: 'kg', format: (v: number) => v.toLocaleString() },
    { label: 'Bags Received', today: data.today.bags, yesterday: data.yesterday.bags, unit: '', format: (v: number) => v.toLocaleString() },
    { label: 'Revenue', today: data.today.revenue, yesterday: data.yesterday.revenue, unit: 'UGX', format: (v: number) => `${(v / 1000000).toFixed(1)}M` },
  ];

  return (
    <div className="space-y-4">
      {/* Today vs Yesterday comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {comparisons.map((c, i) => {
          const change = getChange(c.today, c.yesterday);
          const isUp = change > 0;
          const isDown = change < 0;
          return (
            <Card key={i} className="border-border/40 overflow-hidden">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">{c.label}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-black text-foreground">{c.unit === 'UGX' ? `UGX ${c.format(c.today)}` : `${c.format(c.today)} ${c.unit}`}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Yesterday: {c.unit === 'UGX' ? `UGX ${c.format(c.yesterday)}` : `${c.format(c.yesterday)} ${c.unit}`}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-bold ${isUp ? 'text-success border-success/30 bg-success/10' : isDown ? 'text-destructive border-destructive/30 bg-destructive/10' : 'text-muted-foreground'}`}>
                    {isUp ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : isDown ? <ArrowDownRight className="h-3 w-3 mr-0.5" /> : <Minus className="h-3 w-3 mr-0.5" />}
                    {Math.abs(change)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 7-Day Coffee Purchases Bar Chart */}
      <Card className="border-border/40 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <TrendingUp className="h-4 w-4 text-chart-1" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">7-Day Purchase Trend</CardTitle>
                <p className="text-[10px] text-muted-foreground">Daily coffee purchases this week</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">Last 7 days</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.weekData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Coffee (kg)" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Bags" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyComparisonChart;
