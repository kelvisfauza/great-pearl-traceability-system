import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import StoreRealTimeTracker from "@/components/v2/admin/StoreRealTimeTracker";
import PriceApprovalPanel from "@/components/admin/PriceApprovalPanel";
import { Shield, Users, Settings, BarChart3, Package, FlaskConical, Warehouse, ShoppingCart, TrendingUp, FileText, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AdminDashboard = () => {
  const { employee } = useAuth();

  // Fetch system stats
  const { data: stats } = useQuery({
    queryKey: ["admin-v2-stats"],
    queryFn: async () => {
      const [employees, pendingQuality, readyPayment, inventory] = await Promise.all([
        supabase.from("employees").select("*", { count: "exact", head: true }).eq("status", "Active"),
        supabase.from("coffee_records").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
        supabase.from("finance_coffee_lots").select("*", { count: "exact", head: true }).eq("finance_status", "READY_FOR_FINANCE"),
        supabase.from("inventory_items").select("total_kilograms").eq("status", "available"),
      ]);

      const totalStock = inventory.data?.reduce((sum, item) => sum + (item.total_kilograms || 0), 0) || 0;

      return {
        activeEmployees: employees.count || 0,
        pendingQuality: pendingQuality.count || 0,
        readyPayment: readyPayment.count || 0,
        totalStock: Math.round(totalStock),
      };
    },
  });

  const quickStats = [
    { label: "Active Employees", value: stats?.activeEmployees || 0, icon: Users, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { label: "Pending Quality", value: stats?.pendingQuality || 0, icon: FlaskConical, color: "text-orange-500", bgColor: "bg-orange-500/10" },
    { label: "Ready for Payment", value: stats?.readyPayment || 0, icon: TrendingUp, color: "text-green-500", bgColor: "bg-green-500/10" },
    { label: "Total Stock (kg)", value: stats?.totalStock?.toLocaleString() || 0, icon: Warehouse, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  ];

  const modules = [
    { title: "Store", description: "Manage coffee receipts", icon: Package, path: "/v2/store", color: "text-blue-600", bgColor: "bg-blue-500/10" },
    { title: "Quality", description: "Grade and assess lots", icon: FlaskConical, path: "/v2/quality", color: "text-purple-600", bgColor: "bg-purple-500/10" },
    { title: "Inventory", description: "Track stock levels", icon: Warehouse, path: "/v2/inventory", color: "text-orange-600", bgColor: "bg-orange-500/10" },
    { title: "Sales", description: "Manage sales", icon: ShoppingCart, path: "/v2/sales", color: "text-pink-600", bgColor: "bg-pink-500/10" },
    { title: "Finance", description: "Financial operations", icon: TrendingUp, path: "/v2/finance", color: "text-green-600", bgColor: "bg-green-500/10" },
    { title: "HR", description: "Human resources", icon: Users, path: "/v2/hr", color: "text-indigo-600", bgColor: "bg-indigo-500/10" },
    { title: "Analytics", description: "Data insights", icon: BarChart3, path: "/v2/analytics", color: "text-cyan-600", bgColor: "bg-cyan-500/10" },
    { title: "Reports", description: "System reports", icon: FileText, path: "/v2/reports", color: "text-amber-600", bgColor: "bg-amber-500/10" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Admin Dashboard</h1>
            </div>
            <p className="text-muted-foreground text-lg">System-wide overview and management</p>
          </div>
          <PriceTicker />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <V2Navigation />
          </div>

          <div className="lg:col-span-3 space-y-6">
            {/* Welcome */}
            <Card className="border-2 bg-gradient-to-r from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  Welcome, {employee?.name}
                </CardTitle>
                <p className="text-muted-foreground">{employee?.role} • Full System Access</p>
              </CardHeader>
            </Card>

            {/* Price Approval Requests - Admin Only */}
            <PriceApprovalPanel />

            {/* Store Real-Time Tracking */}
            <StoreRealTimeTracker />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {quickStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                          <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                        <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                          <Icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* All Modules */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                All Departments
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <Link key={module.title} to={module.path}>
                      <Card className="border-2 hover:shadow-lg transition-all cursor-pointer group h-full">
                        <CardContent className="pt-6">
                          <div className={`p-3 rounded-lg ${module.bgColor} w-fit mb-3 group-hover:scale-110 transition-transform`}>
                            <Icon className={`h-6 w-6 ${module.color}`} />
                          </div>
                          <h3 className="font-semibold">{module.title}</h3>
                          <p className="text-xs text-muted-foreground">{module.description}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <Link to="/human-resources">Manage Employees</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/permissions">Permissions</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/reports">Reports</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/">V1 Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
