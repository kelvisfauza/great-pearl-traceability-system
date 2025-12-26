import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { BarChart3, TrendingUp, PieChart, LineChart, FileText, Database, Activity, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const AnalyticsDashboard = () => {
  const { employee } = useAuth();

  const actions = [
    { title: "Performance Analytics", description: "Track KPIs and metrics", icon: TrendingUp, path: "/data-analyst" },
    { title: "Sales Analysis", description: "Revenue and sales trends", icon: LineChart, path: "/reports/sales" },
    { title: "Comparison Reports", description: "Period comparisons", icon: BarChart3, path: "/reports/comparison" },
    { title: "Generate Reports", description: "Custom report builder", icon: FileText, path: "/reports/generator" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-8 w-8 text-cyan-600" />
              <h1 className="text-4xl font-bold text-foreground">Analytics Dashboard</h1>
            </div>
            <p className="text-muted-foreground text-lg">Data insights and business intelligence</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.title} to={action.path}>
                    <Card className="border-2 hover:shadow-lg transition-all cursor-pointer group h-full">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-cyan-500/10 group-hover:scale-110 transition-transform">
                            <Icon className="h-6 w-6 text-cyan-600" />
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
                <Button variant="outline" asChild><Link to="/data-analyst">Full Analytics</Link></Button>
                <Button variant="outline" asChild><Link to="/reports">All Reports</Link></Button>
                <Button variant="outline" asChild><Link to="/">V1 Dashboard</Link></Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
