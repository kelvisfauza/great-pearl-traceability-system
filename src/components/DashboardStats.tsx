
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coffee, TrendingUp, Package, DollarSign, Users, Shield, Building, AlertTriangle } from "lucide-react";
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
    // Previous month data for percentage calculations
    prevMonth: {
      coffeeKgs: 0,
      coffeeBatches: 0,
      revenue: 0,
      suppliers: 0
    }
  });

  // Calculate month-over-month percentage change (used in the subtitle text)
  const calcPercentChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  // Visual progress vs last month (0-100). Prevents showing a full ring when the current value is 0.
  const calcProgressFromPrevious = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.max(0, Math.min(Math.round((current / previous) * 100), 100));
  };

  // Determine trend based on actual values - when both are 0, show stable/neutral
  const getTrend = (
    current: number,
    previous: number,
    percentChange: number
  ): "positive" | "negative" | "stable" => {
    if (current === 0 && previous === 0) return "stable";
    if (percentChange > 0) return "positive";
    if (percentChange < 0) return "negative";
    return "stable";
  };

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        console.log('Fetching monthly dashboard data from Supabase...');
        
        // Get current month date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        
        // Get previous month date range
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
        
        // Fetch coffee records for current month
        const { data: coffeeRecords } = await supabase
          .from('coffee_records')
          .select('*')
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth);

        // Fetch coffee records for previous month
        const { data: prevCoffeeRecords } = await supabase
          .from('coffee_records')
          .select('*')
          .gte('created_at', startOfPrevMonth)
          .lte('created_at', endOfPrevMonth);

        let totalKgs = 0, totalBags = 0, prevKgs = 0;
        const batches = new Set();
        const prevBatches = new Set();
        
        if (coffeeRecords) {
          coffeeRecords.forEach((record) => {
            totalKgs += Number(record.kilograms) || 0;
            totalBags += Number(record.bags) || 0;
            if (record.batch_number) batches.add(record.batch_number);
          });
        }
        
        if (prevCoffeeRecords) {
          prevCoffeeRecords.forEach((record) => {
            prevKgs += Number(record.kilograms) || 0;
            if (record.batch_number) prevBatches.add(record.batch_number);
          });
        }

        // Fetch finance transactions for current month
        const { data: transactions } = await supabase
          .from('finance_cash_transactions')
          .select('*')
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth);
        
        // Fetch finance transactions for previous month
        const { data: prevTransactions } = await supabase
          .from('finance_cash_transactions')
          .select('*')
          .gte('created_at', startOfPrevMonth)
          .lte('created_at', endOfPrevMonth);
        
        let totalRevenue = 0, prevRevenue = 0;
        if (transactions) {
          transactions.forEach((txn) => {
            if (txn.transaction_type === 'cash_in' || txn.transaction_type === 'revenue') {
              totalRevenue += Number(txn.amount) || 0;
            }
          });
        }
        if (prevTransactions) {
          prevTransactions.forEach((txn) => {
            if (txn.transaction_type === 'cash_in' || txn.transaction_type === 'revenue') {
              prevRevenue += Number(txn.amount) || 0;
            }
          });
        }

        // Fetch expenses for current month
        const { data: expenses } = await supabase
          .from('finance_expenses')
          .select('*')
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth);
        
        let totalExpenses = 0;
        if (expenses) {
          expenses.forEach((expense) => {
            totalExpenses += Number(expense.amount) || 0;
          });
        }

        // Fetch new suppliers for current month
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('id')
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth);
        
        // Fetch new suppliers for previous month
        const { data: prevSuppliers } = await supabase
          .from('suppliers')
          .select('id')
          .gte('created_at', startOfPrevMonth)
          .lte('created_at', endOfPrevMonth);
        
        const supplierCount = suppliers?.length || 0;
        const prevSupplierCount = prevSuppliers?.length || 0;

        setRealTimeData({
          coffeeData: { totalKgs, totalBags, totalBatches: batches.size },
          financeData: { totalRevenue, totalExpenses },
          supplierCount,
          inventoryData: { totalBags, totalKgs },
          prevMonth: {
            coffeeKgs: prevKgs,
            coffeeBatches: prevBatches.size,
            revenue: prevRevenue,
            suppliers: prevSupplierCount
          }
        });

        console.log('Monthly dashboard data with comparisons:', {
          month: now.toLocaleString('default', { month: 'long' }),
          current: { totalKgs, totalBatches: batches.size, totalRevenue, supplierCount },
          previous: { prevKgs, prevBatches: prevBatches.size, prevRevenue, prevSupplierCount }
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchRealData();
  }, []);

  // Different stats based on role
  const getStatsForRole = () => {
    // % change (for the subtitle text)
    const inventoryPercent = calcPercentChange(realTimeData.inventoryData.totalKgs, realTimeData.prevMonth.coffeeKgs);
    const batchesPercent = calcPercentChange(realTimeData.coffeeData.totalBatches, realTimeData.prevMonth.coffeeBatches);
    const revenuePercent = calcPercentChange(realTimeData.financeData.totalRevenue, realTimeData.prevMonth.revenue);
    const suppliersPercent = calcPercentChange(realTimeData.supplierCount, realTimeData.prevMonth.suppliers);

    // Visual progress ring (0-100)
    const inventoryProgress = calcProgressFromPrevious(realTimeData.inventoryData.totalKgs, realTimeData.prevMonth.coffeeKgs);
    const batchesProgress = calcProgressFromPrevious(realTimeData.coffeeData.totalBatches, realTimeData.prevMonth.coffeeBatches);
    const revenueProgress = calcProgressFromPrevious(realTimeData.financeData.totalRevenue, realTimeData.prevMonth.revenue);
    const suppliersProgress = calcProgressFromPrevious(realTimeData.supplierCount, realTimeData.prevMonth.suppliers);
    
    // Store Manager sees inventory-focused stats
    if (hasPermission("Store Management")) {
      return [
        {
          title: "Monthly Inventory",
          value: `${(realTimeData.inventoryData.totalKgs / 1000).toFixed(1)}K kg`,
          change: `${realTimeData.inventoryData.totalBags} bags this month`,
          icon: Coffee,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          trend: getTrend(realTimeData.inventoryData.totalKgs, realTimeData.prevMonth.coffeeKgs, inventoryPercent),
          percent: inventoryProgress
        },
        {
          title: "Monthly Batches",
          value: realTimeData.coffeeData.totalBatches.toString(),
          change: "processed this month",
          icon: Package,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          trend: getTrend(realTimeData.coffeeData.totalBatches, realTimeData.prevMonth.coffeeBatches, batchesPercent),
          percent: batchesProgress
        },
        {
          title: "New Suppliers",
          value: realTimeData.supplierCount.toString(),
          change: "registered this month",
          icon: Building,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
          trend: getTrend(realTimeData.supplierCount, realTimeData.prevMonth.suppliers, suppliersPercent),
          percent: suppliersProgress
        },
        {
          title: "Your Role",
          value: employee?.position?.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || "N/A",
          change: employee?.department || "Department",
          icon: Shield,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
          trend: "stable",
          percent: 100
        }
      ];
    }

    // Management roles see financial and operational stats
    if (hasRole("Administrator") || hasRole("Manager") || hasRole("Operations Manager")) {
      const pendingApprovals = requests.filter(req => req.status === 'Pending').length;
      const salaryRequests = requests.filter(req => req.type === 'Salary Payment');
      const totalSalaryRequests = salaryRequests.reduce((sum, req) => {
        return sum + (req.amount || 0);
      }, 0);
      
      return [
        {
          title: "Monthly Revenue",
          value: `UGX ${(realTimeData.financeData.totalRevenue / 1000000).toFixed(1)}M`,
          change: `${revenuePercent >= 0 ? '+' : ''}${revenuePercent}% vs last month`,
          icon: DollarSign,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          trend: getTrend(realTimeData.financeData.totalRevenue, realTimeData.prevMonth.revenue, revenuePercent),
          percent: revenueProgress
        },
        {
          title: "Monthly Coffee",
          value: `${(realTimeData.coffeeData.totalKgs / 1000).toFixed(1)}K kg`,
          change: `${inventoryPercent >= 0 ? '+' : ''}${inventoryPercent}% vs last month`,
          icon: Coffee,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          trend: getTrend(realTimeData.coffeeData.totalKgs, realTimeData.prevMonth.coffeeKgs, inventoryPercent),
          percent: inventoryProgress
        },
        {
          title: "Pending Approvals",
          value: pendingApprovals.toString(),
          change: "require attention",
          icon: AlertTriangle,
          color: pendingApprovals > 0 ? "text-red-600" : "text-green-600",
          bgColor: pendingApprovals > 0 ? "bg-red-50" : "bg-green-50",
          borderColor: pendingApprovals > 0 ? "border-red-200" : "border-green-200",
          trend: pendingApprovals > 0 ? "attention" : "stable",
          percent: pendingApprovals > 0 ? Math.min(pendingApprovals * 10, 100) : 0
        },
        {
          title: "Active Staff",
          value: employees.filter(emp => emp.status === 'Active').length.toString(),
          change: `UGX ${(totalSalaryRequests / 1000000).toFixed(1)}M pending`,
          icon: Users,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
          trend: "stable",
          percent: 85
        }
      ];
    }

    // Default stats for other roles
    return [
      {
        title: "Monthly Batches",
        value: realTimeData.coffeeData.totalBatches.toString(),
        change: `${batchesPercent >= 0 ? '+' : ''}${batchesPercent}% vs last month`,
        icon: Coffee,
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        trend: getTrend(realTimeData.coffeeData.totalBatches, realTimeData.prevMonth.coffeeBatches, batchesPercent),
        percent: batchesProgress
      },
      {
        title: "Monthly Inventory",
        value: `${realTimeData.coffeeData.totalBags} bags`,
        change: `${inventoryPercent >= 0 ? '+' : ''}${inventoryPercent}% vs last month`,
        icon: Package,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        trend: getTrend(realTimeData.inventoryData.totalKgs, realTimeData.prevMonth.coffeeKgs, inventoryPercent),
        percent: inventoryProgress
      },
      {
        title: "Department",
        value: employee?.department || "N/A",
        change: employee?.position || "Position",
        icon: Shield,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-200",
        trend: "stable",
        percent: 100
      },
      {
        title: "New Suppliers",
        value: realTimeData.supplierCount.toString(),
        change: `${suppliersPercent >= 0 ? '+' : ''}${suppliersPercent}% vs last month`,
        icon: Building,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        trend: getTrend(realTimeData.supplierCount, realTimeData.prevMonth.suppliers, suppliersPercent),
        percent: suppliersProgress
      }
    ];
  };

  const stats = getStatsForRole();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide truncate">
              {stat.title}
            </CardTitle>
            <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="space-y-1">
              <div className="text-lg sm:text-3xl font-bold text-foreground truncate">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {stat.change}
              </p>
              {/* Simplified progress bar for mobile - hidden circular on mobile */}
              <div className="hidden sm:block">
                <div className="relative h-16 w-16 mx-auto mt-2">
                  <svg className="transform -rotate-90 h-16 w-16">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${(stat.percent / 100) * 175.93} 175.93`}
                      className={stat.color}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-semibold ${stat.color}`}>{stat.percent}%</span>
                  </div>
                </div>
              </div>
              {/* Simple progress bar for mobile */}
              <div className="sm:hidden mt-2">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stat.color.replace('text-', 'bg-')}`}
                    style={{ width: `${stat.percent}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
