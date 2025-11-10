
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { BarChart3, FileText, TrendingUp, Store, ShoppingCart, BookOpen, Calculator, Receipt, Wallet, AlertTriangle, MapPin, ArrowRight } from "lucide-react";
import KeyMetrics from "@/components/reports/KeyMetrics";
import { RefreshMetricsButton } from "@/components/reports/RefreshMetricsButton";

const Reports = () => {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const isAdmin = employee?.role === 'Administrator' || employee?.role === 'Super Admin' || employee?.role === 'Manager';

  const reportCards = [
    {
      title: "Finance Report",
      description: "Monthly financial overview and analysis",
      icon: Wallet,
      path: "/reports/finance",
      color: "text-blue-600"
    },
    {
      title: "Day Book",
      description: "Daily transaction records",
      icon: BookOpen,
      path: "/reports/daybook",
      color: "text-green-600"
    },
    {
      title: "Expenses",
      description: "Track and analyze expenses",
      icon: Receipt,
      path: "/reports/expenses",
      color: "text-orange-600"
    },
    {
      title: "Reconciliation",
      description: "Monthly account reconciliation",
      icon: Calculator,
      path: "/reports/reconciliation",
      color: "text-purple-600"
    },
    {
      title: "Risk Assessment",
      description: "AI-powered risk analysis",
      icon: AlertTriangle,
      path: "/reports/risk",
      color: "text-red-600"
    },
    {
      title: "Comparison Reports",
      description: "Compare metrics and identify trends",
      icon: BarChart3,
      path: "/reports/comparison",
      color: "text-teal-600"
    },
    {
      title: "Store Reports",
      description: "Inventory and store management",
      icon: Store,
      path: "/reports/store",
      color: "text-indigo-600"
    },
    {
      title: "Sales Reports",
      description: "Sales performance and trends",
      icon: ShoppingCart,
      path: "/reports/sales",
      color: "text-pink-600"
    },
    {
      title: "Performance Analytics",
      description: "Business performance metrics",
      icon: TrendingUp,
      path: "/reports/analytics",
      color: "text-cyan-600"
    },
    {
      title: "Report Generator",
      description: "Create custom reports",
      icon: FileText,
      path: "/reports/generator",
      color: "text-violet-600"
    }
  ];

  if (isAdmin) {
    reportCards.push({
      title: "Field Operations",
      description: "Manage field operations",
      icon: MapPin,
      path: "/reports/field-operations",
      color: "text-emerald-600"
    });
  }

  return (
    <Layout 
      title="Reports & Analytics" 
      subtitle="Comprehensive business intelligence and reporting"
    >
      <div className="space-y-8">
        {/* Quick Overview Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Overview</h2>
            <RefreshMetricsButton />
          </div>
          <KeyMetrics />
        </div>

        {/* Report Categories */}
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-6">Report Categories</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reportCards.map((report) => {
              const Icon = report.icon;
              return (
                <Card 
                  key={report.path}
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 group"
                  onClick={() => navigate(report.path)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className={`h-6 w-6 ${report.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{report.title}</CardTitle>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <CardDescription className="mt-2">{report.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;
