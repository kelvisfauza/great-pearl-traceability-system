
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  LineChart
} from "lucide-react";

const RoleBasedNavigation = () => {
  const location = useLocation();
  const { employee, hasPermission, hasRole } = useAuth();
  
  if (!employee) return null;

  const allNavigationItems = [
    {
      title: "Operations",
      items: [
        { name: "Dashboard", icon: BarChart3, path: "/", permissions: [] },
        { name: "Procurement", icon: Package, path: "/procurement", permissions: ["Procurement"] },
        { name: "Quality Control", icon: ClipboardCheck, path: "/quality-control", permissions: ["Quality Control"] },
        { name: "Processing", icon: Coffee, path: "/processing", permissions: ["Processing"] },
        { name: "Store Management", icon: Shield, path: "/store", permissions: ["Store Management"] },
        { name: "Inventory", icon: Package, path: "/inventory", permissions: ["Inventory"] },
      ]
    },
    {
      title: "Management",
      items: [
        { name: "Sales & Marketing", icon: TrendingUp, path: "/sales-marketing", permissions: ["Sales & Marketing"] },
        { name: "Finance", icon: DollarSign, path: "/finance", permissions: ["Finance"] },
        { name: "Field Operations", icon: MapPin, path: "/field-operations", permissions: ["Field Operations"] },
        { name: "Human Resources", icon: Users, path: "/human-resources", permissions: ["Human Resources"] },
        { name: "Data Analyst", icon: LineChart, path: "/data-analyst", permissions: ["Data Analysis"] },
      ]
    },
    {
      title: "System",
      items: [
        { name: "Reports", icon: FileText, path: "/reports", permissions: ["Reports"] },
        { name: "Settings", icon: Settings, path: "/settings", permissions: [] },
        { name: "Logistics", icon: Truck, path: "/logistics", permissions: ["Logistics"] },
      ]
    }
  ];

  // Filter navigation items based on user permissions
  const filteredNavigationItems = allNavigationItems.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // Dashboard and Settings are accessible to everyone
      if (item.path === "/" || item.path === "/settings") return true;
      
      // Administrator and Manager roles can see everything
      if (hasRole("Administrator") || hasRole("Manager")) return true;
      
      // Check if user has any of the required permissions
      if (item.permissions.length === 0) return true;
      return item.permissions.some(permission => hasPermission(permission));
    })
  })).filter(section => section.items.length > 0);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm font-medium text-green-800">{employee.name}</p>
          <p className="text-xs text-green-600">{employee.position}</p>
          <p className="text-xs text-green-600">{employee.department}</p>
        </div>
        
        <nav className="space-y-6">
          {filteredNavigationItems.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-3">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Button
                      key={itemIndex}
                      variant={isActive ? "default" : "ghost"}
                      className={`w-full justify-start transition-all duration-200 ${
                        isActive 
                          ? "bg-green-600 hover:bg-green-700 text-white shadow-md" 
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                      asChild
                    >
                      <Link to={item.path}>
                        <item.icon className="h-4 w-4 mr-3" />
                        {item.name}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
};

export default RoleBasedNavigation;
