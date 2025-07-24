
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  LogOut
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Navigation = () => {
  const location = useLocation();
  const { signOut, employee, hasPermission, hasRole, isAdmin } = useAuth();
  
  const navigationItems = [
    {
      title: "Operations",
      items: [
        { name: "Dashboard", icon: BarChart3, path: "/", permission: null }, // Everyone can see dashboard
        { name: "Quality Control", icon: ClipboardCheck, path: "/quality-control", permission: "Quality Control" },
        { name: "Store Management", icon: Shield, path: "/store", permission: "Store Management" },
        { name: "Inventory", icon: Package, path: "/inventory", permission: "Inventory" },
        { name: "Field Operations", icon: MapPin, path: "/field-operations", permission: "Field Operations" },
      ]
    },
    {
      title: "Management",
      items: [
        { name: "Sales & Marketing", icon: TrendingUp, path: "/sales-marketing", permission: "Sales Marketing" },
        { name: "Finance", icon: DollarSign, path: "/finance", permission: "Finance" },
        { name: "Human Resources", icon: Users, path: "/human-resources", permission: "Human Resources" },
        { name: "Data Analyst", icon: LineChart, path: "/data-analyst", permission: "Data Analysis" },
      ]
    },
    {
      title: "System",
      items: [
        { name: "Reports", icon: FileText, path: "/reports", permission: "Reports" },
        { name: "Settings", icon: Settings, path: "/settings", permission: null }, // Everyone can access settings
        { name: "Logistics", icon: Truck, path: "/logistics", permission: "Logistics" },
      ]
    }
  ];

  // Filter navigation items based on user permissions
  const getFilteredNavigationItems = () => {
    return navigationItems.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // If no permission required, show to everyone
        if (!item.permission) return true;
        
        // If user is admin, show everything
        if (isAdmin()) return true;
        
        // Check if user has the specific permission
        return hasPermission(item.permission);
      })
    })).filter(section => section.items.length > 0); // Remove empty sections
  };

  const filteredNavigationItems = getFilteredNavigationItems();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-lg text-gray-800">Coffee ERP</h2>
      </div>
      
      <div className="flex-1 p-3">
        <nav className="space-y-4">
          {filteredNavigationItems.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="font-medium text-xs text-gray-500 uppercase tracking-wider mb-2 px-2">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Button
                      key={itemIndex}
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={`w-full justify-start text-sm h-9 ${
                        isActive 
                          ? "bg-green-600 hover:bg-green-700 text-white shadow-sm" 
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                      asChild
                    >
                      <Link to={item.path}>
                        <item.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User info and logout section */}
      <div className="p-3 border-t border-gray-200">
        {employee && (
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-800 truncate">{employee.name}</p>
            <p className="text-xs text-gray-500 truncate">{employee.position}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sm h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
};

export default Navigation;
