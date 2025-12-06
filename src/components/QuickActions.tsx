
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
  Receipt,
  Eye
} from "lucide-react";
import SupplierAdvanceModal from "@/components/finance/SupplierAdvanceModal";
import IssueReceiptModal from "@/components/finance/IssueReceiptModal";
import StorePreviewModal from "@/components/store/StorePreviewModal";

const QuickActions = () => {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const access = useRoleBasedAccess();
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showStorePreviewModal, setShowStorePreviewModal] = useState(false);

  if (!employee) return null;

  const allActions = [
    {
      title: "Store Preview",
      description: "View recent transactions",
      icon: Eye,
      color: "bg-teal-600 hover:bg-teal-700",
      action: () => setShowStorePreviewModal(true),
      access: access.canManageInventory
    },
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
    <Card className="bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3 sm:pb-6 p-4 sm:p-6">
        <CardTitle className="flex items-center text-base sm:text-xl">
          <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground mr-2 sm:mr-3">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          Quick Actions
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Available actions for {employee.role}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {availableActions.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-4">
            {availableActions.slice(0, 6).map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="group h-auto p-3 sm:p-5 flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 text-center sm:text-left border-border/50 hover:border-primary/30 bg-gradient-to-r from-background to-muted/30 hover:scale-[1.02]"
                onClick={() => action.action ? action.action() : navigate(action.route)}
                {...(action.dataAction && { 'data-action': action.dataAction })}
              >
                <div className={`p-2 sm:p-3 rounded-xl ${action.color} text-white flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                  <action.icon className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors duration-300 truncate">
                    {action.title}
                  </div>
                  <div className="hidden sm:block text-sm text-muted-foreground mt-1 line-clamp-2">
                    {action.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 sm:py-12">
            <div className="p-3 sm:p-4 rounded-full bg-muted/50 w-fit mx-auto mb-3 sm:mb-4">
              <Package className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
            </div>
            <p className="text-sm sm:text-base font-medium text-muted-foreground mb-1 sm:mb-2">
              No quick actions available
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground/80">
              Contact your administrator for access
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

      <StorePreviewModal
        open={showStorePreviewModal}
        onOpenChange={setShowStorePreviewModal}
      />
    </Card>
  );
};

export default QuickActions;
