
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coffee, TrendingUp, Package, DollarSign, Users, Shield, Building, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployees } from "@/hooks/useEmployees";
import { useSalaryPayments } from "@/hooks/useSalaryPayments";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DashboardStats = () => {
  const { hasRole, hasPermission, employee } = useAuth();
  const { employees } = useEmployees();
  const { paymentRequests } = useSalaryPayments();
  const { requests } = useApprovalRequests();

  const [coffeeData, setCoffeeData] = useState({ totalKgs: 0, totalBags: 0, totalBatches: 0 });
  const [financeData, setFinanceData] = useState({ totalRevenue: 0, totalExpenses: 0 });
  const [supplierCount, setSupplierCount] = useState(0);

  useEffect(() => {
    const fetchCoffeeData = async () => {
      try {
        const { data, error } = await supabase
          .from('coffee_records')
          .select('kilograms, bags');
        
        if (error) throw error;
        
        const totalKgs = data?.reduce((sum, record) => sum + Number(record.kilograms), 0) || 0;
        const totalBags = data?.reduce((sum, record) => sum + Number(record.bags), 0) || 0;
        const totalBatches = data?.length || 0;
        
        setCoffeeData({ totalKgs, totalBags, totalBatches });
      } catch (error) {
        console.error('Error fetching coffee data:', error);
      }
    };

    const fetchFinanceData = async () => {
      try {
        const { data: transactions, error: transError } = await supabase
          .from('finance_transactions')
          .select('amount, type');
        
        const { data: expenses, error: expError } = await supabase
          .from('finance_expenses')
          .select('amount');

        if (transError) throw transError;
        if (expError) throw expError;
        
        const revenue = transactions?.filter(t => t.type === 'Income').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const totalExpenses = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
        
        setFinanceData({ totalRevenue: revenue, totalExpenses });
      } catch (error) {
        console.error('Error fetching finance data:', error);
      }
    };

    const fetchSupplierCount = async () => {
      try {
        const { count, error } = await supabase
          .from('suppliers')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        setSupplierCount(count || 0);
      } catch (error) {
        console.error('Error fetching supplier count:', error);
      }
    };

    fetchCoffeeData();
    fetchFinanceData();
    fetchSupplierCount();
  }, []);

  // Different stats based on role
  const getStatsForRole = () => {
    // Store Manager sees inventory-focused stats
    if (hasPermission("Store Management")) {
      return [
        {
          title: "Coffee Inventory",
          value: `${(coffeeData.totalKgs / 1000).toFixed(1)}K kg`,
          change: `${coffeeData.totalBags} bags stored`,
          icon: Coffee,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          trend: "positive"
        },
        {
          title: "Active Batches",
          value: coffeeData.totalBatches.toString(),
          change: "processing & stored",
          icon: Package,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          trend: "stable"
        },
        {
          title: "Suppliers",
          value: supplierCount.toString(),
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
      const totalSalaryRequests = paymentRequests.reduce((sum, req) => sum + parseFloat(req.amount.replace(/[^\d.]/g, '')), 0);
      const pendingApprovals = requests.filter(req => req.status === 'Pending').length;
      
      return [
        {
          title: "Total Revenue",
          value: `UGX ${(financeData.totalRevenue / 1000000).toFixed(1)}M`,
          change: "this period",
          icon: DollarSign,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          trend: "positive"
        },
        {
          title: "Coffee Processed",
          value: `${(coffeeData.totalKgs / 1000).toFixed(1)}K kg`,
          change: `${coffeeData.totalBatches} batches total`,
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
          change: `UGX ${(totalSalaryRequests / 1000000).toFixed(1)}M monthly`,
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
        value: coffeeData.totalBatches.toString(),
        change: "in system",
        icon: Coffee,
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        trend: "stable"
      },
      {
        title: "Inventory",
        value: `${coffeeData.totalBags} bags`,
        change: `${(coffeeData.totalKgs / 1000).toFixed(1)}K kg total`,
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
        value: supplierCount.toString(),
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
