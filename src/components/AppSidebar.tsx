import { Link, useLocation } from "react-router-dom";
import { 
  Coffee,
  Users,
  Package,
  TrendingUp,
  Shield,
  FileText,
  Settings,
  Truck,
  BarChart3,
  DollarSign,
  ClipboardCheck,
  MapPin,
  LineChart,
  LogOut,
  UserCheck,
  ArrowRight,
  FileCheck,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  CheckSquare
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleBasedData } from "@/hooks/useRoleBasedData";
import { useUnifiedApprovalRequests } from "@/hooks/useUnifiedApprovalRequests";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const AppSidebar = ({ isCollapsed, onToggle }: AppSidebarProps) => {
  const location = useLocation();
  const { signOut, employee, hasPermission, isAdmin } = useAuth();
  const roleData = useRoleBasedData();
  const { requests: pendingApprovals } = useUnifiedApprovalRequests();
  const [openSections, setOpenSections] = useState<string[]>(["Operations", "Management", "System"]);

  const navigationItems = [
    {
      title: "Operations", 
      items: [
        { name: "Dashboard", icon: BarChart3, path: "/", permission: "Dashboard" },
        { name: "Quality Control", icon: ClipboardCheck, path: "/quality-control", permission: "Quality Control" },
        { name: "Store Management", icon: Shield, path: "/store", permission: "Store Management" },
        { name: "EUDR Documentation", icon: FileText, path: "/eudr-documentation", permission: "EUDR Documentation" },
        { name: "Milling", icon: Coffee, path: "/milling", permission: "Milling" },
        { name: "Inventory", icon: Package, path: "/inventory", permission: "Inventory" },
        { name: "Field Operations", icon: MapPin, path: "/field-operations", permission: "Field Operations" },
      ]
    },
    {
      title: "Management",
      items: [
        { name: "Approvals", icon: CheckSquare, path: "/approvals", permission: null, requiresAdmin: true },
        { name: "Suppliers", icon: UserCheck, path: "/suppliers", permission: null },
        { name: "Sales & Marketing", icon: TrendingUp, path: "/sales-marketing", permission: "Sales Marketing" },
        { name: "My Expenses", icon: DollarSign, path: "/my-expenses", permission: null },
        { name: "Human Resources", icon: Users, path: "/human-resources", permission: "Human Resources" },
        { name: "Data Analyst", icon: LineChart, path: "/data-analyst", permission: "Data Analysis" },
        { name: "IT Department", icon: Settings, path: "/it-department", permission: "IT Management" },
      ]
    },
    {
      title: "System",
      items: [
        { name: "My Daily Reports", icon: FileCheck, path: "/user-daily-reports", permission: null },
        { name: "Reports", icon: FileText, path: "/reports", permission: "Reports" },
        { name: "Settings", icon: Settings, path: "/settings", permission: "Reports" },
        { name: "Logistics", icon: Truck, path: "/logistics", permission: "Logistics" },
      ]
    }
  ];

  const getFilteredNavigationItems = () => {
    if (!employee) {
      return [{
        title: "Operations",
        items: [{ name: "Dashboard", icon: BarChart3, path: "/", permission: null }]
      }];
    }
    
    return navigationItems.map(section => ({
      ...section,
      items: section.items.filter((item: any) => {
        // Check for admin requirement
        if (item.requiresAdmin) {
          return isAdmin();
        }
        // If no permission required, show to everyone
        if (!item.permission) return true;
        // If user is admin, show everything
        if (isAdmin()) return true;
        return hasPermission(item.permission);
      })
    })).filter(section => section.items.length > 0);
  };

  const filteredNavigationItems = getFilteredNavigationItems();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleSection = (title: string) => {
    setOpenSections(prev => 
      prev.includes(title) 
        ? prev.filter(s => s !== title)
        : [...prev, title]
    );
  };

  return (
    <aside 
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Coffee className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-sidebar-foreground">Coffee ERP</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredNavigationItems.map((section) => (
          <Collapsible
            key={section.title}
            open={!isCollapsed && openSections.includes(section.title)}
            onOpenChange={() => !isCollapsed && toggleSection(section.title)}
          >
            {!isCollapsed && (
              <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-2 text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider hover:text-sidebar-foreground/80 transition-colors">
                {section.title}
                <ChevronDown 
                  className={cn(
                    "h-3 w-3 transition-transform",
                    openSections.includes(section.title) && "rotate-180"
                  )} 
                />
              </CollapsibleTrigger>
            )}
            
            <CollapsibleContent className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const isApprovals = item.name === "Approvals";
                const approvalCount = pendingApprovals?.length || 0;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                      isActive 
                        ? "bg-primary text-primary-foreground font-medium" 
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      isCollapsed && "justify-center px-2"
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="flex-1 flex items-center justify-between">
                        {item.name}
                        {isApprovals && approvalCount > 0 && (
                          <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                            {approvalCount > 99 ? '99+' : approvalCount}
                          </Badge>
                        )}
                      </span>
                    )}
                  </Link>
                );
              })}
            </CollapsibleContent>

            {/* Show icons only when collapsed */}
            {isCollapsed && section.items.map((item) => {
              const isActive = location.pathname === item.path;
              const isApprovals = item.name === "Approvals";
              const approvalCount = pendingApprovals?.length || 0;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center justify-center p-2.5 rounded-lg transition-all my-0.5 relative",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                  title={item.name}
                >
                  <item.icon className="h-4 w-4" />
                  {isApprovals && approvalCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]">
                      {approvalCount > 99 ? '99+' : approvalCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </Collapsible>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {!isCollapsed && employee && (
          <div className="px-2 py-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{employee.name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{employee.position}</p>
          </div>
        )}
        
        <Link
          to="/v2"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Switch to V2" : undefined}
        >
          <ArrowRight className="h-4 w-4" />
          {!isCollapsed && <span>Switch to V2</span>}
        </Link>
        
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors w-full",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
