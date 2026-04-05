import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, BarChart3, Activity } from 'lucide-react';

const DailyComparisonChart = () => {
  const [weekData, setWeekData] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const fourteenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13).toISOString().split('T')[0];

      const [{ data: coffee }, { data: txs }] = await Promise.all([
        supabase.from('coffee_records').select('kilograms, bags, date').gte('date', fourteenDaysAgo).lte('date', todayStr),
        supabase.from('finance_cash_transactions').select('amount, transaction_type, created_at').gte('created_at', `${fourteenDaysAgo}T00:00:00`).lte('created_at', `${todayStr}T23:59:59`),
      ]);

      // Build 14-day map
      const dayMap: Record<string, { kgs: number; bags: number; revenue: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        dayMap[d.toISOString().split('T')[0]] = { kgs: 0, bags: 0, revenue: 0 };
      }

      coffee?.forEach(r => {
        const k = r.date?.split('T')[0];
        if (k && dayMap[k]) {
          dayMap[k].kgs += Number(r.kilograms) || 0;
          dayMap[k].bags += Number(r.bags) || 0;
        }
      });

      txs?.forEach(t => {
        const k = t.created_at?.split('T')[0];
        if (k && dayMap[k] && (t.transaction_type === 'cash_in' || t.transaction_type === 'revenue')) {
          dayMap[k].revenue += Number(t.amount) || 0;
        }
      });

      const entries = Object.entries(dayMap);
      const last7 = entries.slice(-7);
      const prev7 = entries.slice(0, 7);

      // Week data for bar chart
      setWeekData(last7.map(([date, vals]) => ({
        day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        'Coffee (kg)': Math.round(vals.kgs),
        Bags: vals.bags,
      })));

      // Comparison: this week vs last week
      setComparisonData(last7.map(([date, vals], i) => {
        const prevVals = prev7[i]?.[1] || { kgs: 0 };
        return {
          day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          'This Week': Math.round(vals.kgs),
          'Last Week': Math.round(prevVals.kgs),
        };
      }));
    };
    fetchData();
  }, []);

  const chartTooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '11px',
    boxShadow: '0 4px 12px hsl(var(--foreground) / 0.08)',
  };

  return (
    <Card className="border-border/30 overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3" />
      <CardHeader className="pb-0 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-chart-1/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-chart-1" />
            </div>
            <CardTitle className="text-sm font-bold">Purchase Analytics</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8 mb-3">
            <TabsTrigger value="daily" className="text-xs gap-1.5"><BarChart3 className="h-3 w-3" />Daily</TabsTrigger>
            <TabsTrigger value="compare" className="text-xs gap-1.5"><Activity className="h-3 w-3" />Week vs Week</TabsTrigger>
          </TabsList>
          <TabsContent value="daily" className="mt-0">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weekData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                <Bar dataKey="Coffee (kg)" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Bags" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="compare" className="mt-0">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={comparisonData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="This Week" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--chart-1))' }} />
                <Line type="monotone" dataKey="Last Week" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="5 5" dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DailyComparisonChart;
