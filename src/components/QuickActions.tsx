
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Plus, 
  FileText, 
  ClipboardCheck, 
  TrendingUp, 
  Package, 
  Users,
  DollarSign,
  Coffee
} from "lucide-react";

const QuickActions = () => {
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();

  const allActions = [
    {
      title: "New Coffee Batch",
      description: "Record incoming coffee delivery",
      icon: Coffee,
      color: "bg-green-600 hover:bg-green-700",
      action: "Add Batch",
      route: "/procurement",
      permissions: ["Procurement"],
      roles: []
    },
    {
      title: "Quality Inspection",
      description: "Start quality control process",
      icon: ClipboardCheck,
      color: "bg-blue-600 hover:bg-blue-700",
      action: "Inspect",
      route: "/quality-control",
      permissions: ["Quality Control"],
      roles: []
    },
    {
      title: "Process Payment",
      description: "Pay supplier or farmer",
      icon: DollarSign,
      color: "bg-amber-600 hover:bg-amber-700",
      action: "Pay Now",
      route: "/finance",
      permissions: ["Finance"],
      roles: ["Administrator", "Manager"]
    },
    {
      title: "Generate Report",
      description: "Create management report",
      icon: FileText,
      color: "bg-purple-600 hover:bg-purple-700",
      action: "Generate",
      route: "/reports",
      permissions: ["Reports"],
      roles: ["Administrator", "Manager", "Operations Manager"]
    },
    {
      title: "Add Supplier",
      description: "Register new coffee supplier",
      icon: Users,
      color: "bg-indigo-600 hover:bg-indigo-700",
      action: "Register",
      route: "/procurement",
      permissions: ["Procurement"],
      roles: []
    },
    {
      title: "Sales Entry",
      description: "Record new sales transaction",
      icon: TrendingUp,
      color: "bg-pink-600 hover:bg-pink-700",
      action: "Record Sale",
      route: "/sales-marketing",
      permissions: ["Sales & Marketing"],
      roles: []
    }
  ];

  // Filter actions based on user permissions and roles
  const availableActions = allActions.filter(action => {
    // Check if user has required permissions
    const hasRequiredPermission = action.permissions.length === 0 || 
      action.permissions.some(permission => hasPermission(permission));
    
    // Check if user has required roles
    const hasRequiredRole = action.roles.length === 0 || 
      action.roles.some(role => hasRole(role));
    
    // Show action if user has permission OR required role
    return hasRequiredPermission || hasRequiredRole;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Plus className="h-5 w-5 mr-2 text-green-600" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Available actions based on your role
        </CardDescription>
      </CardHeader>
      <CardContent>
        {availableActions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start space-y-2 hover:shadow-md transition-all"
                onClick={() => navigate(action.route)}
              >
                <div className="flex items-center space-x-2 w-full">
                  <div className={`p-2 rounded-lg ${action.color} text-white`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium text-sm text-gray-900">
                      {action.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {action.description}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-gray-400 mb-2">
              <Package className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-sm text-gray-500">No quick actions available for your role</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickActions;
