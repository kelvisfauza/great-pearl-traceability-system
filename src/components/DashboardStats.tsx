
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coffee, TrendingUp, Package, DollarSign, Users, Shield, Building, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployees } from "@/hooks/useEmployees";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DashboardStats = () => {
  const { hasRole, hasPermission, employee } = useAuth();
  const { employees } = useEmployees();
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
        console.log('Fetching real-time dashboard data...');
        
        // For now, use mock data since we're transitioning from Firebase to Supabase
        // These tables would need to be created in Supabase if real data is needed
        setRealTimeData({
          coffeeData: { 
            totalKgs: 15000, 
            totalBags: 250, 
            totalBatches: 12 
          },
          financeData: { 
            totalRevenue: 45000000, 
            totalExpenses: 12000000 
          },
          supplierCount: 8,
          inventoryData: {
            totalBags: 180,
            totalKgs: 12000
          }
        });

        console.log('Dashboard data updated with mock data');
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
          title: "Coffee Inventory",
          value: `${(realTimeData.inventoryData.totalKgs / 1000).toFixed(1)}K kg`,
          change: `${realTimeData.inventoryData.totalBags} bags stored`,
          icon: Coffee,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          trend: "positive"
        },
        {
          title: "Active Batches",
          value: realTimeData.coffeeData.totalBatches.toString(),
          change: "processing & stored",
          icon: Package,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          trend: "stable"
        },
        {
          title: "Suppliers",
          value: realTimeData.supplierCount.toString(),
          change: "registered partners",
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
        const amount = typeof req.amount === 'string' ? parseFloat(req.amount.replace(/[^\d.]/g, '')) : 0;
        return sum + amount;
      }, 0);
      
      return [
        {
          title: "Total Revenue",
          value: `UGX ${(realTimeData.financeData.totalRevenue / 1000000).toFixed(1)}M`,
          change: "from transactions",
          icon: DollarSign,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          trend: "positive"
        },
        {
          title: "Coffee Processed",
          value: `${(realTimeData.coffeeData.totalKgs / 1000).toFixed(1)}K kg`,
          change: `${realTimeData.coffeeData.totalBatches} batches total`,
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
          value: employees.filter(emp => emp.status === 'active').length.toString(),
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
        title: "Coffee Batches",
        value: realTimeData.coffeeData.totalBatches.toString(),
        change: "in system",
        icon: Coffee,
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        trend: "stable"
      },
      {
        title: "Inventory",
        value: `${realTimeData.coffeeData.totalBags} bags`,
        change: `${(realTimeData.coffeeData.totalKgs / 1000).toFixed(1)}K kg total`,
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
        title: "Suppliers",
        value: realTimeData.supplierCount.toString(),
        change: "active partners",
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className={`${stat.borderColor} ${stat.bgColor} hover:shadow-md transition-all duration-200 hover:scale-105`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg bg-white shadow-sm`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">{stat.change}</p>
                <Badge 
                  variant={stat.trend === 'positive' ? 'default' : stat.trend === 'attention' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {stat.trend === 'positive' ? '↗ Good' : stat.trend === 'attention' ? '⚠ Action' : '→ Stable'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
