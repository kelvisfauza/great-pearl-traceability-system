
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, TrendingUp, Package, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const DashboardStats = () => {
  const { hasRole, hasPermission, employee } = useAuth();

  // Different stats based on role
  const getStatsForRole = () => {
    // Store Manager sees inventory-focused stats
    if (hasPermission("Store Management")) {
      return [
        {
          title: "Inventory Items",
          value: "1,234",
          change: "+12%",
          icon: Package,
          color: "text-blue-600"
        },
        {
          title: "Storage Capacity",
          value: "78%",
          change: "+5%",
          icon: Package,
          color: "text-green-600"
        },
        {
          title: "Quality Batches",
          value: "156",
          change: "+8%",
          icon: Coffee,
          color: "text-amber-600"
        },
        {
          title: "Active Suppliers",
          value: "42",
          change: "+3%",
          icon: TrendingUp,
          color: "text-purple-600"
        }
      ];
    }

    // Management roles see financial and operational stats
    if (hasRole("Administrator") || hasRole("Manager") || hasRole("Operations Manager")) {
      return [
        {
          title: "Total Revenue",
          value: "UGX 2.4M",
          change: "+15%",
          icon: DollarSign,
          color: "text-green-600"
        },
        {
          title: "Coffee Processed",
          value: "1,234 kg",
          change: "+12%",
          icon: Coffee,
          color: "text-blue-600"
        },
        {
          title: "Active Orders",
          value: "156",
          change: "+8%",
          icon: TrendingUp,
          color: "text-amber-600"
        },
        {
          title: "Suppliers",
          value: "42",
          change: "+3%",
          icon: Package,
          color: "text-purple-600"
        }
      ];
    }

    // Default stats for other roles
    return [
      {
        title: "Today's Tasks",
        value: "12",
        change: "pending",
        icon: Package,
        color: "text-blue-600"
      },
      {
        title: "Coffee Batches",
        value: "34",
        change: "this week",
        icon: Coffee,
        color: "text-green-600"
      },
      {
        title: "Quality Checks",
        value: "8",
        change: "completed",
        icon: TrendingUp,
        color: "text-amber-600"
      },
      {
        title: "Department",
        value: employee?.department || "N/A",
        change: "current",
        icon: DollarSign,
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
              {stat.change} from last month
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
