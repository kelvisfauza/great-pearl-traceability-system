import { Card, CardContent } from "@/components/ui/card";
import { Coffee, TrendingUp, TrendingDown, Minus, Package, DollarSign, Users, Shield, Building, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedEmployees } from "@/hooks/useUnifiedEmployees";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DashboardStats = () => {
  const { hasRole, hasPermission, employee } = useAuth();
  const { employees } = useUnifiedEmployees();
  const { requests } = useApprovalRequests();

  const [realTimeData, setRealTimeData] = useState({
    coffeeData: { totalKgs: 0, totalBags: 0, totalBatches: 0 },
    financeData: { totalRevenue: 0, totalExpenses: 0 },
    supplierCount: 0,
    inventoryData: { totalBags: 0, totalKgs: 0 },
    prevMonth: {
      coffeeKgs: 0,
      coffeeBatches: 0,
      revenue: 0,
      suppliers: 0
    }
  });

  const calcPercentChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const getTrend = (current: number, previous: number, percentChange: number): "positive" | "negative" | "stable" => {
    if (current === 0 && previous === 0) return "stable";
    if (percentChange > 0) return "positive";
    if (percentChange < 0) return "negative";
    return "stable";
  };

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

        const [
          { data: coffeeRecords },
          { data: prevCoffeeRecords },
          { data: transactions },
          { data: prevTransactions },
          { data: expenses },
          { data: suppliers },
          { data: prevSuppliers }
        ] = await Promise.all([
          supabase.from('coffee_records').select('*').gte('created_at', startOfMonth).lte('created_at', endOfMonth),
          supabase.from('coffee_records').select('*').gte('created_at', startOfPrevMonth).lte('created_at', endOfPrevMonth),
          supabase.from('finance_cash_transactions').select('*').gte('created_at', startOfMonth).lte('created_at', endOfMonth),
          supabase.from('finance_cash_transactions').select('*').gte('created_at', startOfPrevMonth).lte('created_at', endOfPrevMonth),
          supabase.from('finance_expenses').select('*').gte('created_at', startOfMonth).lte('created_at', endOfMonth),
          supabase.from('suppliers').select('id').gte('created_at', startOfMonth).lte('created_at', endOfMonth),
          supabase.from('suppliers').select('id').gte('created_at', startOfPrevMonth).lte('created_at', endOfPrevMonth),
        ]);

        let totalKgs = 0, totalBags = 0, prevKgs = 0;
        const batches = new Set();
        const prevBatches = new Set();
        
        coffeeRecords?.forEach(r => { totalKgs += Number(r.kilograms) || 0; totalBags += Number(r.bags) || 0; if (r.batch_number) batches.add(r.batch_number); });
        prevCoffeeRecords?.forEach(r => { prevKgs += Number(r.kilograms) || 0; if (r.batch_number) prevBatches.add(r.batch_number); });

        let totalRevenue = 0, prevRevenue = 0, totalExpenses = 0;
        transactions?.forEach(t => { if (t.transaction_type === 'cash_in' || t.transaction_type === 'revenue') totalRevenue += Number(t.amount) || 0; });
        prevTransactions?.forEach(t => { if (t.transaction_type === 'cash_in' || t.transaction_type === 'revenue') prevRevenue += Number(t.amount) || 0; });
        expenses?.forEach(e => { totalExpenses += Number(e.amount) || 0; });

        setRealTimeData({
          coffeeData: { totalKgs, totalBags, totalBatches: batches.size },
          financeData: { totalRevenue, totalExpenses },
          supplierCount: suppliers?.length || 0,
          inventoryData: { totalBags, totalKgs },
          prevMonth: { coffeeKgs: prevKgs, coffeeBatches: prevBatches.size, revenue: prevRevenue, suppliers: prevSuppliers?.length || 0 }
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };
    fetchRealData();
  }, []);

  const getStatsForRole = () => {
    const inventoryPercent = calcPercentChange(realTimeData.inventoryData.totalKgs, realTimeData.prevMonth.coffeeKgs);
    const batchesPercent = calcPercentChange(realTimeData.coffeeData.totalBatches, realTimeData.prevMonth.coffeeBatches);
    const revenuePercent = calcPercentChange(realTimeData.financeData.totalRevenue, realTimeData.prevMonth.revenue);
    const suppliersPercent = calcPercentChange(realTimeData.supplierCount, realTimeData.prevMonth.suppliers);

    if (hasPermission("Store Management")) {
      return [
        { title: "Monthly Inventory", value: `${(realTimeData.inventoryData.totalKgs / 1000).toFixed(1)}K kg`, change: `${realTimeData.inventoryData.totalBags} bags`, icon: Coffee, trend: getTrend(realTimeData.inventoryData.totalKgs, realTimeData.prevMonth.coffeeKgs, inventoryPercent), percent: inventoryPercent, gradient: "from-chart-1/15 to-chart-1/5" },
        { title: "Monthly Batches", value: realTimeData.coffeeData.totalBatches.toString(), change: "processed", icon: Package, trend: getTrend(realTimeData.coffeeData.totalBatches, realTimeData.prevMonth.coffeeBatches, batchesPercent), percent: batchesPercent, gradient: "from-chart-2/15 to-chart-2/5" },
        { title: "New Suppliers", value: realTimeData.supplierCount.toString(), change: "registered", icon: Building, trend: getTrend(realTimeData.supplierCount, realTimeData.prevMonth.suppliers, suppliersPercent), percent: suppliersPercent, gradient: "from-chart-3/15 to-chart-3/5" },
        { title: "Your Role", value: employee?.position || "N/A", change: employee?.department || "", icon: Shield, trend: "stable" as const, percent: 0, gradient: "from-chart-4/15 to-chart-4/5" },
      ];
    }

    if (hasRole("Administrator") || hasRole("Manager") || hasRole("Operations Manager")) {
      const pendingApprovals = requests.filter(req => req.status === 'Pending').length;
      const salaryTotal = requests.filter(req => req.type === 'Salary Payment').reduce((s, r) => s + (r.amount || 0), 0);
      return [
        { title: "Monthly Revenue", value: `UGX ${(realTimeData.financeData.totalRevenue / 1000000).toFixed(1)}M`, change: `vs last month`, icon: DollarSign, trend: getTrend(realTimeData.financeData.totalRevenue, realTimeData.prevMonth.revenue, revenuePercent), percent: revenuePercent, gradient: "from-success/15 to-success/5" },
        { title: "Monthly Coffee", value: `${(realTimeData.coffeeData.totalKgs / 1000).toFixed(1)}K kg`, change: `vs last month`, icon: Coffee, trend: getTrend(realTimeData.coffeeData.totalKgs, realTimeData.prevMonth.coffeeKgs, inventoryPercent), percent: inventoryPercent, gradient: "from-chart-3/15 to-chart-3/5" },
        { title: "Pending Approvals", value: pendingApprovals.toString(), change: "require attention", icon: AlertTriangle, trend: pendingApprovals > 0 ? "negative" as const : "stable" as const, percent: 0, urgent: pendingApprovals > 0, gradient: pendingApprovals > 0 ? "from-destructive/15 to-destructive/5" : "from-chart-1/15 to-chart-1/5" },
        { title: "Active Staff", value: employees.filter(emp => emp.status === 'Active').length.toString(), change: `UGX ${(salaryTotal / 1000000).toFixed(1)}M pending`, icon: Users, trend: "stable" as const, percent: 0, gradient: "from-chart-4/15 to-chart-4/5" },
      ];
    }

    return [
      { title: "Monthly Batches", value: realTimeData.coffeeData.totalBatches.toString(), change: "vs last month", icon: Coffee, trend: getTrend(realTimeData.coffeeData.totalBatches, realTimeData.prevMonth.coffeeBatches, batchesPercent), percent: batchesPercent, gradient: "from-chart-1/15 to-chart-1/5" },
      { title: "Monthly Inventory", value: `${realTimeData.coffeeData.totalBags} bags`, change: "vs last month", icon: Package, trend: getTrend(realTimeData.inventoryData.totalKgs, realTimeData.prevMonth.coffeeKgs, inventoryPercent), percent: inventoryPercent, gradient: "from-chart-2/15 to-chart-2/5" },
      { title: "Department", value: employee?.department || "N/A", change: employee?.position || "", icon: Shield, trend: "stable" as const, percent: 0, gradient: "from-chart-4/15 to-chart-4/5" },
      { title: "New Suppliers", value: realTimeData.supplierCount.toString(), change: "vs last month", icon: Building, trend: getTrend(realTimeData.supplierCount, realTimeData.prevMonth.suppliers, suppliersPercent), percent: suppliersPercent, gradient: "from-chart-3/15 to-chart-3/5" },
    ];
  };

  const stats = getStatsForRole();

  const trendColor = (trend: string, urgent?: boolean) => {
    if (urgent) return 'text-destructive';
    if (trend === 'positive') return 'text-success';
    if (trend === 'negative') return 'text-destructive';
    return 'text-muted-foreground';
  };

  const trendBg = (trend: string, urgent?: boolean) => {
    if (urgent) return 'bg-destructive/10';
    if (trend === 'positive') return 'bg-success/10';
    if (trend === 'negative') return 'bg-destructive/10';
    return 'bg-muted/50';
  };

  const iconColor = (index: number) => {
    const colors = ['text-chart-1', 'text-chart-2', 'text-chart-3', 'text-chart-4'];
    return colors[index % colors.length];
  };

  const iconBg = (index: number) => {
    const bgs = ['bg-chart-1/10', 'bg-chart-2/10', 'bg-chart-3/10', 'bg-chart-4/10'];
    return bgs[index % bgs.length];
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className={`relative overflow-hidden border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group hover:-translate-y-0.5`}>
            {/* Top gradient bar */}
            <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
            
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${iconBg(index)} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`h-5 w-5 ${iconColor(index)}`} />
                </div>
                {stat.percent !== 0 && (
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${trendBg(stat.trend, (stat as any).urgent)} ${trendColor(stat.trend, (stat as any).urgent)}`}>
                    {stat.trend === 'positive' ? <ArrowUpRight className="h-3 w-3" /> : stat.trend === 'negative' ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    <span>{Math.abs(stat.percent)}%</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                  {stat.title}
                </p>
                <p className="text-2xl md:text-3xl font-black text-foreground tracking-tight truncate leading-none">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-2 truncate font-medium">
                  {stat.change}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardStats;
