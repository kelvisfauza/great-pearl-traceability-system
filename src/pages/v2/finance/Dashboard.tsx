import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Wallet, TrendingUp, TrendingDown, Receipt, CreditCard, DollarSign, FileText, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const FinanceDashboard = () => {
  const { employee } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["finance-v2-stats"],
    queryFn: async () => {
      const [readyPayment, pendingApprovals, cashBalance] = await Promise.all([
        supabase.from("finance_coffee_lots").select("*", { count: "exact", head: true }).eq("finance_status", "READY_FOR_FINANCE"),
        supabase.from("approval_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("finance_cash_balance").select("current_balance").single(),
      ]);

      return {
        readyPayment: readyPayment.count || 0,
        pendingApprovals: pendingApprovals.count || 0,
        cashBalance: cashBalance.data?.current_balance || 0,
      };
    },
  });

  const quickStats = [
    { label: "Ready for Payment", value: stats?.readyPayment || 0, icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-500/10" },
    { label: "Pending Approvals", value: stats?.pendingApprovals || 0, icon: Receipt, color: "text-orange-500", bgColor: "bg-orange-500/10" },
    { label: "Cash Balance", value: `UGX ${(stats?.cashBalance || 0).toLocaleString()}`, icon: Wallet, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  ];

  const actions = [
    { title: "Process Payments", description: "Pay suppliers for assessed lots", icon: CreditCard, path: "/v2/finance/payments" },
    { title: "Approve Requests", description: "Review pending approvals", icon: CheckCircle2, path: "/v2/finance/approvals" },
    { title: "Cash Management", description: "Track cash inflows and outflows", icon: DollarSign, path: "/v2/finance/cash" },
    { title: "Reports", description: "Financial reports and summaries", icon: FileText, path: "/reports/finance" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="h-8 w-8 text-green-600" />
              <h1 className="text-4xl font-bold text-foreground">Finance Dashboard</h1>
            </div>
            <p className="text-muted-foreground text-lg">Payments, approvals, and cash management</p>
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
                          <div className="p-3 rounded-lg bg-green-500/10 group-hover:scale-110 transition-transform">
                            <Icon className="h-6 w-6 text-green-600" />
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
                <Button variant="outline" asChild><Link to="/expenses">Expenses</Link></Button>
                <Button variant="outline" asChild><Link to="/reports/daybook">Day Book</Link></Button>
                <Button variant="outline" asChild><Link to="/">V1 Dashboard</Link></Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;
