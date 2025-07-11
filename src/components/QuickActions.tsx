
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const actions = [
    {
      title: "New Coffee Batch",
      description: "Record incoming coffee delivery",
      icon: Coffee,
      color: "bg-green-600 hover:bg-green-700",
      action: "Add Batch"
    },
    {
      title: "Quality Inspection",
      description: "Start quality control process",
      icon: ClipboardCheck,
      color: "bg-blue-600 hover:bg-blue-700",
      action: "Inspect"
    },
    {
      title: "Process Payment",
      description: "Pay supplier or farmer",
      icon: DollarSign,
      color: "bg-amber-600 hover:bg-amber-700",
      action: "Pay Now"
    },
    {
      title: "Generate Report",
      description: "Create management report",
      icon: FileText,
      color: "bg-purple-600 hover:bg-purple-700",
      action: "Generate"
    },
    {
      title: "Add Supplier",
      description: "Register new coffee supplier",
      icon: Users,
      color: "bg-indigo-600 hover:bg-indigo-700",
      action: "Register"
    },
    {
      title: "Sales Entry",
      description: "Record new sales transaction",
      icon: TrendingUp,
      color: "bg-pink-600 hover:bg-pink-700",
      action: "Record Sale"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Plus className="h-5 w-5 mr-2 text-green-600" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Common tasks and shortcuts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start space-y-2 hover:shadow-md transition-all"
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
      </CardContent>
    </Card>
  );
};

export default QuickActions;
