import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coffee, Package, DollarSign, Users, AlertTriangle, Building, Shield, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedEmployees } from "@/hooks/useUnifiedEmployees";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const DashboardStats = () => {
  const { hasRole, hasPermission, employee } = useAuth();
  const { employees } = useUnifiedEmployees();
  const { requests } = useApprovalRequests();

  const [realTimeData, setRealTimeData] = useState({
    coffeeData: { totalKgs: 0, totalBags: 0, totalBatches: 0 },
    financeData: { totalRevenue: 0, totalExpenses: 0 },
    supplierCount: 0,
    inventoryData: { totalBags: 0, totalKgs: 0 },
    prevMonth: { coffeeKgs: 0, coffeeBatches: 0, revenue: 0, suppliers: 0 },
    todayData: { coffeeKgs: 0, bags: 0, revenue: 0 },
    yesterdayData: { coffeeKgs: 0, bags: 0, revenue: 0 },
    weeklySparkline: [] as { v: number }[],
  });

  const calcPercent = (c: number, p: number) => p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100);
  const trend = (c: number, p: number) => { const pct = calcPercent(c, p); return pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'; };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
        const todayStr = now.toISOString().split('T')[0];
        const yesterdayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString().split('T')[0];

        const [
          { data: coffeeRecords }, { data: prevCoffeeRecords },
          { data: transactions }, { data: prevTransactions },
          { data: expenses }, { data: suppliers }, { data: prevSuppliers },
          { data: todayCoffee }, { data: yesterdayCoffee },
          { data: todayTx }, { data: yesterdayTx },
          { data: weekCoffee },
        ] = await Promise.all([
          supabase.from('coffee_records').select('kilograms, bags, batch_number').gte('created_at', startOfMonth).lte('created_at', endOfMonth),
          supabase.from('coffee_records').select('kilograms, batch_number').gte('created_at', startOfPrevMonth).lte('created_at', endOfPrevMonth),
          supabase.from('finance_cash_transactions').select('amount, transaction_type').gte('created_at', startOfMonth).lte('created_at', endOfMonth),
          supabase.from('finance_cash_transactions').select('amount, transaction_type').gte('created_at', startOfPrevMonth).lte('created_at', endOfPrevMonth),
          supabase.from('finance_expenses').select('amount').gte('created_at', startOfMonth).lte('created_at', endOfMonth),
          supabase.from('suppliers').select('id').gte('created_at', startOfMonth).lte('created_at', endOfMonth),
          supabase.from('suppliers').select('id').gte('created_at', startOfPrevMonth).lte('created_at', endOfPrevMonth),
          supabase.from('coffee_records').select('kilograms, bags').eq('date', todayStr),
          supabase.from('coffee_records').select('kilograms, bags').eq('date', yesterdayStr),
          supabase.from('finance_cash_transactions').select('amount, transaction_type').gte('created_at', `${todayStr}T00:00:00`).lte('created_at', `${todayStr}T23:59:59`),
          supabase.from('finance_cash_transactions').select('amount, transaction_type').gte('created_at', `${yesterdayStr}T00:00:00`).lte('created_at', `${yesterdayStr}T23:59:59`),
          supabase.from('coffee_records').select('kilograms, date').gte('date', new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString().split('T')[0]).lte('date', todayStr),
        ]);

        let totalKgs = 0, totalBags = 0, prevKgs = 0;
        const batches = new Set(), prevBatches = new Set();
        coffeeRecords?.forEach(r => { totalKgs += Number(r.kilograms) || 0; totalBags += Number(r.bags) || 0; if (r.batch_number) batches.add(r.batch_number); });
        prevCoffeeRecords?.forEach(r => { prevKgs += Number(r.kilograms) || 0; if (r.batch_number) prevBatches.add(r.batch_number); });

        let totalRevenue = 0, prevRevenue = 0, totalExpenses = 0;
        const revFilter = (t: any) => t.transaction_type === 'cash_in' || t.transaction_type === 'revenue';
        transactions?.forEach(t => { if (revFilter(t)) totalRevenue += Number(t.amount) || 0; });
        prevTransactions?.forEach(t => { if (revFilter(t)) prevRevenue += Number(t.amount) || 0; });
        expenses?.forEach(e => { totalExpenses += Number(e.amount) || 0; });

        const sumKgs = (arr: any[]) => arr?.reduce((s, r) => s + (Number(r.kilograms) || 0), 0) || 0;
        const sumBags = (arr: any[]) => arr?.reduce((s, r) => s + (Number(r.bags) || 0), 0) || 0;
        const sumRev = (arr: any[]) => arr?.filter(revFilter).reduce((s, t) => s + (Number(t.amount) || 0), 0) || 0;

        // Build sparkline
        const dayMap: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          dayMap[d.toISOString().split('T')[0]] = 0;
        }
        weekCoffee?.forEach(r => { const k = r.date?.split('T')[0]; if (k && dayMap[k] !== undefined) dayMap[k] += Number(r.kilograms) || 0; });
        const weeklySparkline = Object.values(dayMap).map(v => ({ v: Math.round(v) }));

        setRealTimeData({
          coffeeData: { totalKgs, totalBags, totalBatches: batches.size },
          financeData: { totalRevenue, totalExpenses },
          supplierCount: suppliers?.length || 0,
          inventoryData: { totalBags, totalKgs },
          prevMonth: { coffeeKgs: prevKgs, coffeeBatches: prevBatches.size, revenue: prevRevenue, suppliers: prevSuppliers?.length || 0 },
          todayData: { coffeeKgs: sumKgs(todayCoffee), bags: sumBags(todayCoffee), revenue: sumRev(todayTx) },
          yesterdayData: { coffeeKgs: sumKgs(yesterdayCoffee), bags: sumBags(yesterdayCoffee), revenue: sumRev(yesterdayTx) },
          weeklySparkline,
        });
      } catch (err) { console.error('Dashboard fetch error:', err); }
    };
    fetchAll();
  }, []);

  const d = realTimeData;
  const pendingApprovals = requests.filter(r => r.status === 'Pending').length;

  const stats = [
    {
      title: "Today's Purchases",
      value: `${d.todayData.coffeeKgs.toLocaleString()} kg`,
      sub: `Yesterday: ${d.yesterdayData.coffeeKgs.toLocaleString()} kg`,
      change: calcPercent(d.todayData.coffeeKgs, d.yesterdayData.coffeeKgs),
      trend: trend(d.todayData.coffeeKgs, d.yesterdayData.coffeeKgs),
      icon: Coffee,
      color: 'chart-1',
      sparkline: d.weeklySparkline,
    },
    {
      title: "Today's Revenue",
      value: `UGX ${(d.todayData.revenue / 1000000).toFixed(1)}M`,
      sub: `Yesterday: UGX ${(d.yesterdayData.revenue / 1000000).toFixed(1)}M`,
      change: calcPercent(d.todayData.revenue, d.yesterdayData.revenue),
      trend: trend(d.todayData.revenue, d.yesterdayData.revenue),
      icon: DollarSign,
      color: 'success',
      sparkline: [],
    },
    {
      title: "Monthly Coffee",
      value: `${(d.coffeeData.totalKgs / 1000).toFixed(1)}K kg`,
      sub: `${d.coffeeData.totalBags} bags · ${d.coffeeData.totalBatches} batches`,
      change: calcPercent(d.coffeeData.totalKgs, d.prevMonth.coffeeKgs),
      trend: trend(d.coffeeData.totalKgs, d.prevMonth.coffeeKgs),
      icon: Package,
      color: 'chart-3',
      sparkline: [],
    },
    {
      title: "Pending Approvals",
      value: pendingApprovals.toString(),
      sub: `${employees.filter(e => e.status === 'Active').length} active staff`,
      change: 0,
      trend: pendingApprovals > 0 ? 'down' : 'flat',
      icon: pendingApprovals > 0 ? AlertTriangle : Users,
      color: pendingApprovals > 0 ? 'destructive' : 'chart-4',
      sparkline: [],
      urgent: pendingApprovals > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        const isUp = stat.trend === 'up';
        const isDown = stat.trend === 'down';
        return (
          <Card key={i} className="relative overflow-hidden border-border/30 hover:border-border/60 transition-all duration-300 group hover:shadow-md">
            <CardContent className="p-4 pb-3">
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-${stat.color}/10`}>
                  <Icon className={`h-4 w-4 text-${stat.color}`} />
                </div>
                {stat.change !== 0 && (
                  <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0 h-5 ${
                    isUp ? 'text-success border-success/30 bg-success/5' : 
                    isDown && !stat.urgent ? 'text-destructive border-destructive/30 bg-destructive/5' :
                    stat.urgent ? 'text-destructive border-destructive/30 bg-destructive/5' :
                    'text-muted-foreground'
                  }`}>
                    {isUp ? <ArrowUpRight className="h-3 w-3" /> : isDown ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {Math.abs(stat.change)}%
                  </Badge>
                )}
                {stat.urgent && stat.change === 0 && (
                  <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 h-5 text-destructive border-destructive/30 bg-destructive/5 animate-pulse">
                    Action needed
                  </Badge>
                )}
              </div>

              {/* Value */}
              <p className="text-xl md:text-2xl font-black text-foreground tracking-tight leading-none mb-1">
                {stat.value}
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {stat.title}
              </p>

              {/* Sparkline */}
              {stat.sparkline.length > 0 && (
                <div className="h-8 -mx-1 mb-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stat.sparkline} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`spark-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={`hsl(var(--${stat.color}))`} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={`hsl(var(--${stat.color}))`} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke={`hsl(var(--${stat.color}))`} fill={`url(#spark-${i})`} strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Sub text */}
              <p className="text-[10px] text-muted-foreground truncate">{stat.sub}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardStats;
