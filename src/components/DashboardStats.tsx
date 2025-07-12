
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, TrendingUp, Package, DollarSign, Users, Shield } from "lucide-react";
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
          title: "Total Coffee (KG)",
          value: `${(coffeeData.totalKgs / 1000).toFixed(1)}K`,
          change: `${coffeeData.totalBatches} batches`,
          icon: Coffee,
          color: "text-blue-600"
        },
        {
          title: "Total Bags",
          value: coffeeData.totalBags.toLocaleString(),
          change: "in storage",
          icon: Package,
          color: "text-green-600"
        },
        {
          title: "Active Suppliers",
          value: supplierCount.toString(),
          change: "registered",
          icon: Users,
          color: "text-amber-600"
        },
        {
          title: "Your Department",
          value: employee?.department || "N/A",
          change: "current role",
          icon: Shield,
          color: "text-purple-600"
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
          color: "text-green-600"
        },
        {
          title: "Coffee Processed",
          value: `${(coffeeData.totalKgs / 1000).toFixed(1)}K kg`,
          change: `${coffeeData.totalBatches} batches`,
          icon: Coffee,
          color: "text-blue-600"
        },
        {
          title: "Pending Approvals",
          value: pendingApprovals.toString(),
          change: "requires action",
          icon: TrendingUp,
          color: "text-amber-600"
        },
        {
          title: "Active Employees",
          value: employees.filter(emp => emp.status === 'Active').length.toString(),
          change: `UGX ${(totalSalaryRequests / 1000000).toFixed(1)}M payroll`,
          icon: Users,
          color: "text-purple-600"
        }
      ];
    }

    // Default stats for other roles
    const userTasks = coffeeData.totalBatches; // Could be enhanced with actual task data
    return [
      {
        title: "Coffee Batches",
        value: coffeeData.totalBatches.toString(),
        change: "processed",
        icon: Coffee,
        color: "text-blue-600"
      },
      {
        title: "Total Storage",
        value: `${coffeeData.totalBags} bags`,
        change: `${(coffeeData.totalKgs / 1000).toFixed(1)}K kg`,
        icon: Package,
        color: "text-green-600"
      },
      {
        title: "Your Department",
        value: employee?.department || "N/A",
        change: employee?.position || "N/A",
        icon: Shield,
        color: "text-amber-600"
      },
      {
        title: "Active Suppliers",
        value: supplierCount.toString(),
        change: "in system",
        icon: Users,
        color: "text-purple-600"
      }
    ];
  };

  const stats = getStatsForRole();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stat.change}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
