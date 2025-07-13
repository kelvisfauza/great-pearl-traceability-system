
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
  const { signOut, employee } = useAuth();
  
  const navigationItems = [
    {
      title: "Operations",
      items: [
        { name: "Dashboard", icon: BarChart3, path: "/" },
        { name: "Procurement", icon: Package, path: "/procurement" },
        { name: "Quality Control", icon: ClipboardCheck, path: "/quality-control" },
        { name: "Processing", icon: Coffee, path: "/processing" },
        { name: "Store Management", icon: Shield, path: "/store" },
        { name: "Inventory", icon: Package, path: "/inventory" },
      ]
    },
    {
      title: "Management",
      items: [
        { name: "Sales & Marketing", icon: TrendingUp, path: "/sales-marketing" },
        { name: "Finance", icon: DollarSign, path: "/finance" },
        { name: "Field Operations", icon: MapPin, path: "/field-operations" },
        { name: "Human Resources", icon: Users, path: "/human-resources" },
        { name: "Data Analyst", icon: LineChart, path: "/data-analyst" },
      ]
    },
    {
      title: "System",
      items: [
        { name: "Reports", icon: FileText, path: "/reports" },
        { name: "Settings", icon: Settings, path: "/settings" },
        { name: "Logistics", icon: Truck, path: "/logistics" },
      ]
    }
  ];

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
          {navigationItems.map((section, sectionIndex) => (
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
