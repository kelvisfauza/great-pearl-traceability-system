import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { FileCheck, Globe, Shield, FileText, Package, CheckCircle2, AlertTriangle, Leaf } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const EUDRDashboard = () => {
  const { employee } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["eudr-v2-stats"],
    queryFn: async () => {
      const [documents, batches] = await Promise.all([
        supabase.from("eudr_documents").select("status"),
        supabase.from("eudr_batches").select("status"),
      ]);

      const activeDocuments = documents.data?.filter(d => d.status === 'active').length || 0;
      const activeBatches = batches.data?.filter(b => b.status === 'available').length || 0;

      return {
        activeDocuments,
        activeBatches,
        totalDocuments: documents.data?.length || 0,
      };
    },
  });

  const quickStats = [
    { label: "Active Documents", value: stats?.activeDocuments || 0, icon: FileCheck, color: "text-green-500", bgColor: "bg-green-500/10" },
    { label: "Available Batches", value: stats?.activeBatches || 0, icon: Package, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { label: "Total Documents", value: stats?.totalDocuments || 0, icon: FileText, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  ];

  const actions = [
    { title: "EUDR Documentation", description: "Manage compliance documents", icon: FileCheck, path: "/eudr-documentation" },
    { title: "Batch Management", description: "Track coffee batches", icon: Package, path: "/v2/eudr/batches" },
    { title: "Compliance Check", description: "Verify EUDR compliance", icon: Shield, path: "/v2/eudr/compliance" },
    { title: "Export Reports", description: "Generate EUDR reports", icon: Globe, path: "/v2/eudr/reports" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Leaf className="h-8 w-8 text-green-600" />
              <h1 className="text-4xl font-bold text-foreground">EUDR Dashboard</h1>
            </div>
            <p className="text-muted-foreground text-lg">EU Deforestation Regulation compliance</p>
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
                <Button variant="outline" asChild><Link to="/eudr-documentation">Full EUDR Module</Link></Button>
                <Button variant="outline" asChild><Link to="/">V1 Dashboard</Link></Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EUDRDashboard;
