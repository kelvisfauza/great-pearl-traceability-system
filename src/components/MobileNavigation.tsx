import { Link, useLocation } from "react-router-dom";
import { 
  Coffee, Users, Package, TrendingUp, Shield, FileText, Settings,
  Truck, BarChart3, DollarSign, ClipboardCheck, MapPin, LineChart,
  Receipt, UserCheck, Home, X, ArrowRight, CheckSquare, BookMarked,
  Banknote, FileCheck, CalendarDays, FileSpreadsheet, Wallet, ChevronDown
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isTraineeRole, isTraineeRouteAllowed } from "@/lib/trainee";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNavigation = ({ isOpen, onClose }: MobileNavigationProps) => {
  const location = useLocation();
  const { signOut, employee, hasPermission, hasRole, isAdmin } = useAuth();
  const [openGroups, setOpenGroups] = useState<string[]>(["/procurement", "/human-resources", "/reports", "/data-analyst"]);

  const navigationItems = [
    {
      title: "Operations", 
      items: [
        { name: "Dashboard", icon: BarChart3, path: "/", permission: "Reports" },
        { name: "Quality Control", icon: ClipboardCheck, path: "/quality-control", permission: "Quality Control" },
        { name: "Store Management", icon: Shield, path: "/store", permission: "Store Management" },
        { name: "EUDR Documentation", icon: FileText, path: "/eudr-documentation", permission: "EUDR Documentation" },
        { name: "Milling", icon: Coffee, path: "/milling", permission: "Milling" },
        { name: "Procurement", icon: Package, path: "/procurement", permission: "Procurement", children: [
          { name: "Procurement Review", icon: ClipboardCheck, path: "/procurement-review" },
        ] },
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
        { name: "Company Forms", icon: DollarSign, path: "/my-expenses", permission: null },
        { name: "Quick Loans", icon: Banknote, path: "/quick-loans", permission: null, requiresAdmin: true },
        { name: "Human Resources", icon: Users, path: "/human-resources", permission: "Human Resources", children: [
          { name: "Leave Requests", icon: CalendarDays, path: "/admin/leave-requests", requiresAdmin: true },
        ] },
        { name: "Trade", icon: LineChart, path: "/data-analyst", permission: "Data Analysis", children: [
          { name: "Coffee Bookings", icon: BookMarked, path: "/coffee-bookings", requiresAdmin: true },
        ] },
        { name: "IT Department", icon: Settings, path: "/it-department", permission: "IT Management" },
      ]
    },
    {
      title: "System",
      items: [
        { name: "My Daily Reports", icon: FileCheck, path: "/user-daily-reports", permission: null },
        { name: "Reports", icon: FileText, path: "/reports", permission: "Reports", children: [
          { name: "Excel Reports", icon: FileSpreadsheet, path: "/admin/excel-reports", requiresAdmin: true },
        ] },
        { name: "Settings", icon: Settings, path: "/settings", permission: null },
        { name: "Logistics", icon: Truck, path: "/logistics", permission: "Logistics" },
      ]
    },
    {
      title: "Admin",
      items: [
        { name: "Excel Work Rewards", icon: FileText, path: "/excel-loyalty", permission: null, requiresAdmin: true },
        { name: "Budget Wallet", icon: Wallet, path: "/budget-wallet", permission: null },
        { name: "Budget Management", icon: Wallet, path: "/admin/budget-management", permission: null, requiresAdmin: true },
      ]
    }
  ];

  const getFilteredNavigationItems = () => {
    if (!employee) return [];

    if (isTraineeRole(employee.role)) {
      return navigationItems.map(section => ({
        ...section,
        items: section.items.filter((item: any) =>
          !item.requiresAdmin && isTraineeRouteAllowed(item.path)
        ).map((item: any) => ({ ...item, children: item.children?.filter((child: any) =>
          !child.requiresAdmin && isTraineeRouteAllowed(child.path) && child.path !== '/procurement-review'
        ) }))
      })).filter(section => section.items.length > 0);
    }
    
    return navigationItems.map(section => ({
      ...section,
      items: section.items.filter(item => {
        if ((item as any).requiresAdmin && !isAdmin()) return false;
        if (!item.permission) return true;
        if (section.title === 'Reports') return true;
        if (isAdmin()) return true;
        return hasPermission(item.permission);
      }).map((item: any) => ({ ...item, children: item.children?.filter((child: any) =>
        !child.requiresAdmin || isAdmin()
      ) }))
    })).filter(section => section.items.length > 0);
  };

  const filteredItems = getFilteredNavigationItems();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 md:hidden"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-background border-r border-border z-50 md:hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {employee?.name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{employee?.name}</p>
                {employee?.employee_id && (
                  <p className="text-xs font-semibold text-primary truncate">{employee.employee_id}</p>
                )}
                <p className="text-xs text-muted-foreground truncate">{employee?.position}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-2">
            <div className="space-y-4 py-4">
              {filteredItems.map((section) => (
                <div key={section.title}>
                  <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      
                      return (
                        <div key={item.path}>
                        <div className="flex items-center">
                        <Link
                          to={item.path}
                          onClick={onClose}
                          className={`flex flex-1 min-w-0 items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-foreground hover:bg-accent'
                          }`}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <span className="text-sm font-medium">{item.name}</span>
                        </Link>
                        {item.children?.length > 0 && <Button variant="ghost" size="icon" aria-label={`Toggle ${item.name} links`} aria-expanded={openGroups.includes(item.path)} onClick={() => setOpenGroups(prev => prev.includes(item.path) ? prev.filter(path => path !== item.path) : [...prev, item.path])}><ChevronDown className="h-4 w-4" /></Button>}
                        </div>
                        {openGroups.includes(item.path) && item.children?.map((child: any) => (
                          <Link key={child.path} to={child.path} onClick={onClose} className={`flex items-center gap-3 ml-6 px-3 py-2 rounded-md text-sm ${location.pathname === child.path ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'}`}><child.icon className="h-4 w-4 shrink-0" />{child.name}</Link>
                        ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-border space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
              asChild
            >
              <Link to="/v2" onClick={onClose}>
                <ArrowRight className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Switch to V2</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
              asChild
            >
              <Link to="/v3" onClick={onClose}>
                <ArrowRight className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Switch to V3 (Export)</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                signOut();
                onClose();
              }}
            >
              <span className="text-sm font-medium">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNavigation;
