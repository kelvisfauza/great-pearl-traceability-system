
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useRoleBasedAccess } from "@/hooks/useRoleBasedAccess";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { 
  Plus, 
  FileText, 
  ClipboardCheck, 
  TrendingUp, 
  Package, 
  Users,
  DollarSign,
  Coffee,
  ShoppingCart,
  Receipt
} from "lucide-react";
import SupplierAdvanceModal from "@/components/finance/SupplierAdvanceModal";
import IssueReceiptModal from "@/components/finance/IssueReceiptModal";

const QuickActions = () => {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const access = useRoleBasedAccess();
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  if (!employee) return null;

  const allActions = [
    {
      title: "Purchase Coffee",
      description: "Record new coffee delivery",
      icon: ShoppingCart,
      color: "bg-orange-600 hover:bg-orange-700",
      route: "/store?tab=records",
      access: access.canManageInventory
    },
    {
      title: "New Coffee Batch",
      description: "Record incoming coffee delivery",
      icon: Coffee,
      color: "bg-green-600 hover:bg-green-700",
      route: "/procurement",
      access: access.canViewProcurement
    },
    {
      title: "Quality Inspection",
      description: "Start quality control process",
      icon: ClipboardCheck,
      color: "bg-blue-600 hover:bg-blue-700",
      route: "/quality-control",
      access: access.canManageQuality
    },
    {
      title: "Process Payment",
      description: "Pay supplier or farmer",
      icon: DollarSign,
      color: "bg-amber-600 hover:bg-amber-700",
      route: "/finance",
      access: access.canProcessPayments
    },
    {
      title: "Generate Report",
      description: "Create management report",
      icon: FileText,
      color: "bg-purple-600 hover:bg-purple-700",
      route: "/reports",
      access: access.canGenerateReports
    },
    {
      title: "Add Supplier",
      description: "Register new coffee supplier",
      icon: Users,
      color: "bg-indigo-600 hover:bg-indigo-700",
      route: "/store?tab=suppliers",
      access: access.canViewProcurement || access.canManageInventory
    },
    {
      title: "Sales Entry",
      description: "Record new sales transaction",
      icon: TrendingUp,
      color: "bg-pink-600 hover:bg-pink-700",
      route: "/sales-marketing",
      access: access.canViewSales
    },
    {
      title: "Give Advance",
      description: "Provide advance to supplier",
      icon: DollarSign,
      color: "bg-emerald-600 hover:bg-emerald-700",
      action: () => setShowAdvanceModal(true),
      access: access.canProcessPayments
    },
    {
      title: "Issue Receipt",
      description: "Generate payment receipt",
      icon: Receipt,
      color: "bg-cyan-600 hover:bg-cyan-700",
      action: () => setShowReceiptModal(true),
      access: access.canProcessPayments,
      dataAction: "issue-receipt"
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
          Available actions for {employee.role} in {employee.department}
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
                onClick={() => action.action ? action.action() : navigate(action.route)}
                {...(action.dataAction && { 'data-action': action.dataAction })}
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
              No quick actions available for {employee.role} role
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Contact your administrator if you need additional access
            </p>
          </div>
        )}
      </CardContent>
      
      <SupplierAdvanceModal 
        open={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
      />
      
      <IssueReceiptModal
        open={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
      />
    </Card>
  );
};

export default QuickActions;
