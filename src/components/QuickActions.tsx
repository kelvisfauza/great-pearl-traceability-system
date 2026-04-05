
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Eye,
  Monitor,
  ArrowRight,
  Zap
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
      title: "Price Display",
      description: "Open price monitor display",
      icon: Monitor,
      iconColor: "text-chart-5",
      iconBg: "bg-chart-5/10",
      action: () => window.open('/display', '_blank'),
      access: access.canManageInventory || access.canViewSales
    },
    {
      title: "Store Preview",
      description: "View recent transactions",
      icon: Eye,
      iconColor: "text-chart-2",
      iconBg: "bg-chart-2/10",
      action: () => setShowStorePreviewModal(true),
      access: access.canManageInventory
    },
    {
      title: "Purchase Coffee",
      description: "Record new coffee delivery",
      icon: ShoppingCart,
      iconColor: "text-chart-3",
      iconBg: "bg-chart-3/10",
      route: "/store?tab=records",
      access: access.canManageInventory
    },
    {
      title: "New Coffee Batch",
      description: "Record incoming coffee delivery",
      icon: Coffee,
      iconColor: "text-success",
      iconBg: "bg-success/10",
      route: "/procurement",
      access: access.canViewProcurement
    },
    {
      title: "Quality Inspection",
      description: "Start quality control process",
      icon: ClipboardCheck,
      iconColor: "text-chart-1",
      iconBg: "bg-chart-1/10",
      route: "/quality-control",
      access: access.canManageQuality
    },
    {
      title: "Process Payment",
      description: "Pay supplier or farmer",
      icon: DollarSign,
      iconColor: "text-chart-3",
      iconBg: "bg-chart-3/10",
      route: "/finance",
      access: access.canProcessPayments
    },
    {
      title: "Generate Report",
      description: "Create management report",
      icon: FileText,
      iconColor: "text-chart-4",
      iconBg: "bg-chart-4/10",
      route: "/reports",
      access: access.canGenerateReports
    },
    {
      title: "Add Supplier",
      description: "Register new coffee supplier",
      icon: Users,
      iconColor: "text-chart-1",
      iconBg: "bg-chart-1/10",
      route: "/store?tab=suppliers",
      access: access.canViewProcurement || access.canManageInventory
    },
    {
      title: "Sales Entry",
      description: "Record new sales transaction",
      icon: TrendingUp,
      iconColor: "text-chart-5",
      iconBg: "bg-chart-5/10",
      route: "/sales-marketing",
      access: access.canViewSales
    },
    {
      title: "Give Advance",
      description: "Provide advance to supplier",
      icon: DollarSign,
      iconColor: "text-success",
      iconBg: "bg-success/10",
      action: () => setShowAdvanceModal(true),
      access: access.canProcessPayments
    },
    {
      title: "Issue Receipt",
      description: "Generate payment receipt",
      icon: Receipt,
      iconColor: "text-chart-2",
      iconBg: "bg-chart-2/10",
      action: () => setShowReceiptModal(true),
      access: access.canProcessPayments,
      dataAction: "issue-receipt"
    }
  ];

  const availableActions = allActions.filter(action => action.access);

  return (
    <Card className="border-border/50 shadow-lg shadow-primary/5 overflow-hidden h-full">
      <div className="h-1 bg-gradient-to-r from-chart-3 to-primary" />
      <CardHeader className="pb-3 border-b border-border/40 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-chart-3/15 to-primary/10 rounded-xl">
              <Zap className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {availableActions.length} actions available for {employee.role}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {availableActions.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableActions.slice(0, 6).map((action, index) => (
              <button
                key={index}
                className="group relative flex flex-col items-center gap-3 p-4 rounded-xl border border-border/40 bg-card hover:bg-accent/50 hover:border-primary/20 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 text-center"
                onClick={() => action.action ? action.action() : navigate(action.route!)}
                {...(action.dataAction && { 'data-action': action.dataAction })}
              >
                <div className={`p-3 rounded-xl ${action.iconBg} group-hover:scale-110 transition-transform duration-200`}>
                  <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {action.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 hidden sm:block">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="absolute top-3 right-3 h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-primary group-hover:text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="p-4 rounded-2xl bg-muted/30 w-fit mx-auto mb-4">
              <Package className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">
              No quick actions available
            </p>
            <p className="text-xs text-muted-foreground/70">
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
