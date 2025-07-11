
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Package, 
  TrendingUp,
  Users
} from "lucide-react";

const RecentActivity = () => {
  const activities = [
    {
      id: 1,
      type: "quality",
      title: "Quality inspection completed",
      description: "Batch #QB-2024-0145 approved for export",
      time: "2 hours ago",
      status: "success",
      icon: CheckCircle
    },
    {
      id: 2,
      type: "procurement",
      title: "New coffee delivery",
      description: "3.2 tons received from Bushenyi farmers",
      time: "4 hours ago",
      status: "info",
      icon: Package
    },
    {
      id: 3,
      type: "alert",
      title: "Low inventory alert",
      description: "Arabica stock below minimum threshold",
      time: "6 hours ago",
      status: "warning",
      icon: AlertCircle
    },
    {
      id: 4,
      type: "sales",
      title: "Export contract signed",
      description: "15 tons to European buyer - €45,000",
      time: "8 hours ago",
      status: "success",
      icon: TrendingUp
    },
    {
      id: 5,
      type: "hr",
      title: "New field agent onboarded",
      description: "Sarah Nakato assigned to Masaka region",
      time: "1 day ago",
      status: "info",
      icon: Users
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success": return "text-green-600 bg-green-50";
      case "warning": return "text-amber-600 bg-amber-50";
      case "info": return "text-blue-600 bg-blue-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "success": return "default";
      case "warning": return "destructive";
      case "info": return "secondary";
      default: return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2 text-blue-600" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest updates from across the factory
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                <activity.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {activity.title}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {activity.description}
                </p>
                <div className="flex items-center mt-2 space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {activity.time}
                  </Badge>
                  <Badge variant={getBadgeVariant(activity.status)} className="text-xs">
                    {activity.type}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
