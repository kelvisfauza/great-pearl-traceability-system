import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { MapPin, Users, Package, FileText, Truck, Phone, Calendar, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const FieldOperationsDashboard = () => {
  const { employee } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["field-ops-v2-stats"],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [agents, purchases, farmers] = await Promise.all([
        supabase.from("field_agents").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("field_purchases").select("kgs_purchased").gte("purchase_date", today),
        supabase.from("farmer_profiles").select("*", { count: "exact", head: true }),
      ]);

      const todayKgs = purchases.data?.reduce((sum, p) => sum + (p.kgs_purchased || 0), 0) || 0;

      return {
        activeAgents: agents.count || 0,
        todayPurchases: Math.round(todayKgs),
        totalFarmers: farmers.count || 0,
      };
    },
  });

  const quickStats = [
    { label: "Active Agents", value: stats?.activeAgents || 0, icon: Users, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { label: "Today's Purchases (kg)", value: stats?.todayPurchases?.toLocaleString() || 0, icon: Package, color: "text-green-500", bgColor: "bg-green-500/10" },
    { label: "Registered Farmers", value: stats?.totalFarmers || 0, icon: MapPin, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  ];

  const actions = [
    { title: "Field Purchases", description: "Record field coffee purchases", icon: Package, path: "/field-operations" },
    { title: "Farmer Profiles", description: "Manage farmer database", icon: Users, path: "/v2/field-operations/farmers" },
    { title: "Daily Reports", description: "Submit field reports", icon: FileText, path: "/user-daily-reports" },
    { title: "Route Planning", description: "Plan collection routes", icon: Truck, path: "/v2/field-operations/routes" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="h-8 w-8 text-emerald-600" />
              <h1 className="text-4xl font-bold text-foreground">Field Operations</h1>
            </div>
            <p className="text-muted-foreground text-lg">Field purchases, farmers, and collections</p>
          </div>
          <PriceTicker />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <V2Navigation />
          </div>

          <div className="lg:col-span-3 space-y-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Welcome, {employee?.name}</CardTitle>
                <p className="text-muted-foreground">{employee?.position} • {employee?.department}</p>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                          <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                          <Icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.title} to={action.path}>
                    <Card className="border-2 hover:shadow-lg transition-all cursor-pointer group h-full">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-emerald-500/10 group-hover:scale-110 transition-transform">
                            <Icon className="h-6 w-6 text-emerald-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{action.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" asChild><Link to="/field-operations">Full Field Ops</Link></Button>
                <Button variant="outline" asChild><Link to="/">V1 Dashboard</Link></Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldOperationsDashboard;
