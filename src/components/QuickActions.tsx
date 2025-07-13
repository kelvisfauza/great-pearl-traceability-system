
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useRoleBasedData } from "@/hooks/useRoleBasedData";
import { 
  Plus, 
  FileText, 
  ClipboardCheck, 
  TrendingUp, 
  Package, 
  Users,
  DollarSign,
  Coffee,
  ShoppingCart
} from "lucide-react";

const QuickActions = () => {
  const navigate = useNavigate();
  const dataFilters = useRoleBasedData();

  if (!dataFilters) return null;

  const allActions = [
    {
      title: "Purchase Coffee",
      description: "Record new coffee delivery",
      icon: ShoppingCart,
      color: "bg-orange-600 hover:bg-orange-700",
      action: "Record Purchase",
      route: "/store?tab=records",
      access: dataFilters.canViewInventory
    },
    {
      title: "New Coffee Batch",
      description: "Record incoming coffee delivery",
      icon: Coffee,
      color: "bg-green-600 hover:bg-green-700",
      action: "Add Batch",
      route: "/procurement",
      access: dataFilters.canViewProcurement
    },
    {
      title: "Quality Inspection",
      description: "Start quality control process",
      icon: ClipboardCheck,
      color: "bg-blue-600 hover:bg-blue-700",
      action: "Inspect",
      route: "/quality-control",
      access: dataFilters.canViewQualityControl
    },
    {
      title: "Process Payment",
      description: "Pay supplier or farmer",
      icon: DollarSign,
      color: "bg-amber-600 hover:bg-amber-700",
      action: "Pay Now",
      route: "/finance",
      access: dataFilters.canViewFinancialData
    },
    {
      title: "Generate Report",
      description: "Create management report",
      icon: FileText,
      color: "bg-purple-600 hover:bg-purple-700",
      action: "Generate",
      route: "/reports",
      access: dataFilters.canViewReports
    },
    {
      title: "Add Supplier",
      description: "Register new coffee supplier",
      icon: Users,
      color: "bg-indigo-600 hover:bg-indigo-700",
      action: "Register",
      route: "/store?tab=suppliers",
      access: dataFilters.canViewProcurement || dataFilters.canViewInventory
    },
    {
      title: "Sales Entry",
      description: "Record new sales transaction",
      icon: TrendingUp,
      color: "bg-pink-600 hover:bg-pink-700",
      action: "Record Sale",
      route: "/sales-marketing",
      access: dataFilters.canViewAnalytics || dataFilters.userDepartment === 'Sales'
    }
  ];

  // Filter actions based on user access
  const availableActions = allActions.filter(action => action.access);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Plus className="h-5 w-5 mr-2 text-green-600" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Available actions for {dataFilters.userRole} in {dataFilters.userDepartment}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {availableActions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {availableActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start space-y-3 hover:shadow-md transition-all text-left"
                onClick={() => navigate(action.route)}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className={`p-2 rounded-lg ${action.color} text-white flex-shrink-0`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {action.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
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
            <p className="text-sm text-gray-500">
              No quick actions available for {dataFilters.userRole} role
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Contact your administrator if you need additional access
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickActions;
