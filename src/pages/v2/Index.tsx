import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import V2Navigation from "@/components/v2/V2Navigation";
import { Package, FlaskConical, Wallet, Warehouse, ShoppingCart, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

const V2Index = () => {
  const { employee } = useAuth();

  const quickStats = [
    {
      label: "Pending Quality Check",
      value: "12",
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      label: "Ready for Payment",
      value: "8",
      icon: Wallet,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "Available Stock (kg)",
      value: "2,450",
      icon: Warehouse,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      label: "Completed Today",
      value: "15",
      icon: CheckCircle2,
      color: "text-primary",
      bgColor: "bg-primary/10"
    }
  ];

  const modules = [
    {
      title: "Store Management",
      description: "Register coffee receipts and track incoming inventory",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
      path: "/v2/store"
    },
    {
      title: "Quality Control",
      description: "Grade coffee quality and set pricing",
      icon: FlaskConical,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
      path: "/v2/quality"
    },
    {
      title: "Finance",
      description: "Process supplier payments and manage advances",
      icon: Wallet,
      color: "text-green-600",
      bgColor: "bg-green-500/10",
      path: "/v2/finance"
    },
    {
      title: "Inventory",
      description: "Track stock levels and movements",
      icon: Warehouse,
      color: "text-orange-600",
      bgColor: "bg-orange-500/10",
      path: "/v2/inventory"
    },
    {
      title: "Sales",
      description: "Manage customer sales and contracts",
      icon: ShoppingCart,
      color: "text-pink-600",
      bgColor: "bg-pink-500/10",
      path: "/v2/sales"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              Coffee Management System
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Store → Quality → Finance → Inventory → Sales
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <V2Navigation />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Welcome Card */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Welcome back, {employee?.name}!</CardTitle>
                <p className="text-muted-foreground">
                  {employee?.position} • {employee?.department}
                </p>
              </CardHeader>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                          <p className="text-3xl font-bold">{stat.value}</p>
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

            {/* Modules Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4">System Modules</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <Card 
                      key={module.title} 
                      className="border-2 hover:shadow-lg transition-all cursor-pointer group"
                    >
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${module.bgColor} group-hover:scale-110 transition-transform`}>
                            <Icon className={`h-6 w-6 ${module.color}`} />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2">{module.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {module.description}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default V2Index;
