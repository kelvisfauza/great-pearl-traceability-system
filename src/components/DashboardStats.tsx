
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
    inventoryData: { totalBags: 0, totalKgs: 0 }
  });

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        console.log('Fetching monthly dashboard data from Supabase...');
        
        // Get current month date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        
        // Fetch coffee records for current month only
        const { data: coffeeRecords, error: coffeeError } = await supabase
          .from('coffee_records')
          .select('*')
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth)
          .order('created_at', { ascending: false });

        let totalKgs = 0;
        let totalBags = 0;
        const batches = new Set();
        
        if (coffeeRecords && coffeeRecords.length > 0) {
          coffeeRecords.forEach((record) => {
            totalKgs += Number(record.kilograms) || 0;
            totalBags += Number(record.bags) || 0;
            if (record.batch_number) {
              batches.add(record.batch_number);
            }
          });
        }

        // Fetch finance cash transactions for current month
        const { data: transactions } = await supabase
          .from('finance_cash_transactions')
          .select('*')
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth);
        
        let totalRevenue = 0;
        if (transactions) {
          transactions.forEach((txn) => {
            if (txn.transaction_type === 'cash_in' || txn.transaction_type === 'revenue') {
              totalRevenue += Number(txn.amount) || 0;
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

        // Fetch new suppliers registered this month
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('id')
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth);
        
        const supplierCount = suppliers?.length || 0;

        // Use coffee records as inventory data
        let inventoryBags = totalBags;
        let inventoryKgs = totalKgs;

        setRealTimeData({
          coffeeData: { 
            totalKgs, 
            totalBags, 
            totalBatches: batches.size 
          },
          financeData: { 
            totalRevenue, 
            totalExpenses 
          },
          supplierCount,
          inventoryData: {
            totalBags: inventoryBags,
            totalKgs: inventoryKgs
          }
        });

        console.log('Monthly dashboard data updated:', {
          month: now.toLocaleString('default', { month: 'long' }),
          coffeeData: { totalKgs, totalBags, totalBatches: batches.size },
          financeData: { totalRevenue, totalExpenses },
          supplierCount,
          inventoryData: { totalBags: inventoryBags, totalKgs: inventoryKgs }
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchRealData();
  }, []);

  // Different stats based on role
  const getStatsForRole = () => {
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
          trend: "positive"
        },
        {
          title: "Monthly Batches",
          value: realTimeData.coffeeData.totalBatches.toString(),
          change: "processed this month",
          icon: Package,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          trend: "stable"
        },
        {
          title: "New Suppliers",
          value: realTimeData.supplierCount.toString(),
          change: "registered this month",
          icon: Building,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
          trend: "positive"
        },
        {
          title: "Your Role",
          value: employee?.position?.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || "N/A",
          change: employee?.department || "Department",
          icon: Shield,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
          trend: "stable"
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
          change: "this month",
          icon: DollarSign,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          trend: "positive"
        },
        {
          title: "Monthly Coffee",
          value: `${(realTimeData.coffeeData.totalKgs / 1000).toFixed(1)}K kg`,
          change: `${realTimeData.coffeeData.totalBatches} batches this month`,
          icon: Coffee,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          trend: "positive"
        },
        {
          title: "Pending Approvals",
          value: pendingApprovals.toString(),
          change: "require attention",
          icon: AlertTriangle,
          color: pendingApprovals > 0 ? "text-red-600" : "text-green-600",
          bgColor: pendingApprovals > 0 ? "bg-red-50" : "bg-green-50",
          borderColor: pendingApprovals > 0 ? "border-red-200" : "border-green-200",
          trend: pendingApprovals > 0 ? "attention" : "positive"
        },
        {
          title: "Active Staff",
          value: employees.filter(emp => emp.status === 'Active').length.toString(),
          change: `UGX ${(totalSalaryRequests / 1000000).toFixed(1)}M pending`,
          icon: Users,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
          trend: "stable"
        }
      ];
    }

    // Default stats for other roles
    return [
      {
        title: "Monthly Batches",
        value: realTimeData.coffeeData.totalBatches.toString(),
        change: "this month",
        icon: Coffee,
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        trend: "stable"
      },
      {
        title: "Monthly Inventory",
        value: `${realTimeData.coffeeData.totalBags} bags`,
        change: `${(realTimeData.coffeeData.totalKgs / 1000).toFixed(1)}K kg this month`,
        icon: Package,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        trend: "stable"
      },
      {
        title: "Department",
        value: employee?.department || "N/A",
        change: employee?.position || "Position",
        icon: Shield,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-200",
        trend: "stable"
      },
      {
        title: "New Suppliers",
        value: realTimeData.supplierCount.toString(),
        change: "this month",
        icon: Building,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        trend: "positive"
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
                      strokeDasharray={`${stat.trend === 'positive' ? 75 : stat.trend === 'attention' ? 45 : 60} 175.93`}
                      className={stat.trend === 'positive' ? 'text-green-500' : stat.trend === 'attention' ? 'text-red-500' : 'text-blue-500'}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-semibold ${stat.trend === 'positive' ? 'text-green-600' : stat.trend === 'attention' ? 'text-red-600' : 'text-blue-600'}`}>
                      {stat.trend === 'positive' ? '75%' : stat.trend === 'attention' ? '45%' : '60%'}
                    </span>
                  </div>
                </div>
              </div>
              {/* Simple progress bar for mobile */}
              <div className="sm:hidden mt-2">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${stat.trend === 'positive' ? 'bg-green-500' : stat.trend === 'attention' ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: stat.trend === 'positive' ? '75%' : stat.trend === 'attention' ? '45%' : '60%' }}
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
