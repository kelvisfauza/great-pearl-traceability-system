
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign, 
  Users, 
  Coffee 
} from "lucide-react";

const DashboardStats = () => {
  const stats = [
    {
      title: "Total Coffee Processed",
      value: "2,847",
      unit: "bags",
      change: "+12.5%",
      trend: "up",
      icon: Coffee,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Revenue This Month",
      value: "UGX 847M",
      unit: "",
      change: "+8.2%",
      trend: "up", 
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Quality Score",
      value: "94.2%",
      unit: "",
      change: "+2.1%",
      trend: "up",
      icon: Package,
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    },
    {
      title: "Active Suppliers",
      value: "124",
      unit: "farmers",
      change: "-3.0%",
      trend: "down",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <div className={`h-8 w-8 rounded-full ${stat.bgColor} flex items-center justify-center`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stat.value}
              {stat.unit && <span className="text-sm font-normal text-gray-500 ml-1">{stat.unit}</span>}
            </div>
            <div className="flex items-center mt-2">
              <Badge 
                variant={stat.trend === "up" ? "default" : "destructive"}
                className={`mr-2 ${
                  stat.trend === "up" 
                    ? "bg-green-100 text-green-800 hover:bg-green-100" 
                    : "bg-red-100 text-red-800 hover:bg-red-100"
                }`}
              >
                {stat.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {stat.change}
              </Badge>
              <span className="text-xs text-gray-500">vs last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
