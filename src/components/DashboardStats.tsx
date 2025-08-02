
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coffee, TrendingUp, Package, DollarSign, Users, Shield, Building, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployees } from "@/hooks/useEmployees";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { firebaseClient } from "@/lib/firebaseClient";

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
        
        // Fetch coffee records using firebaseClient (same as inventory page)
        const { data: coffeeRecords, error: coffeeError } = await firebaseClient
          .from('coffee_records')
          .select()
          .order('created_at', { ascending: false })
          .get();

        let totalKgs = 0;
        let totalBags = 0;
        const batches = new Set();
        
        if (coffeeRecords && coffeeRecords.length > 0) {
          coffeeRecords.forEach((record) => {
            totalKgs += Number(record.kilograms || record.weight) || 0;
            totalBags += Number(record.bags || record.quantity) || 0;
            if (record.batch_number || record.batchNumber) {
              batches.add(record.batch_number || record.batchNumber);
            }
          });
        }

        // Fetch finance transactions for revenue
        const transactionsSnapshot = await getDocs(collection(db, 'finance_transactions'));
        let totalRevenue = 0;
        transactionsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.type === 'Income' || data.type === 'Revenue') {
            totalRevenue += Number(data.amount) || 0;
          }
        });

        // Fetch expenses
        const expensesSnapshot = await getDocs(collection(db, 'finance_expenses'));
        let totalExpenses = 0;
        expensesSnapshot.forEach((doc) => {
          const data = doc.data();
          totalExpenses += Number(data.amount) || 0;
        });

        // Fetch suppliers count
        const suppliersSnapshot = await getDocs(collection(db, 'suppliers'));
        const supplierCount = suppliersSnapshot.size;

        // Use coffee records as inventory data (same as inventory page)
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

        console.log('Dashboard data updated:', {
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
        <Card key={index} className="group relative overflow-hidden bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {stat.title}
            </CardTitle>
            <div className="p-3 rounded-xl bg-gradient-to-br from-background to-muted border border-border/50 shadow-sm group-hover:shadow-md transition-all duration-300">
              <stat.icon className={`h-5 w-5 ${stat.color} group-hover:scale-110 transition-transform duration-300`} />
            </div>
          </CardHeader>
          <CardContent className="relative z-10 space-y-4">
            <div className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
              {stat.value}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.change}</p>
              <Badge 
                variant={stat.trend === 'positive' ? 'default' : stat.trend === 'attention' ? 'destructive' : 'secondary'}
                className="text-xs font-medium"
              >
                {stat.trend === 'positive' ? '↗ Good' : stat.trend === 'attention' ? '⚠ Action' : '→ Stable'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
