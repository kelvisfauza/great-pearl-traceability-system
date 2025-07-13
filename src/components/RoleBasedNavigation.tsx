
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleBasedData } from "@/hooks/useRoleBasedData";
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
  const { employee } = useAuth();
  const dataFilters = useRoleBasedData();
  
  if (!employee || !dataFilters) return null;

  const allNavigationItems = [
    {
      title: "Operations",
      items: [
        { 
          name: "Dashboard", 
          icon: BarChart3, 
          path: "/", 
          access: true // Everyone gets dashboard access
        },
        { 
          name: "Procurement", 
          icon: Package, 
          path: "/procurement", 
          access: dataFilters.canViewProcurement
        },
        { 
          name: "Quality Control", 
          icon: ClipboardCheck, 
          path: "/quality-control", 
          access: dataFilters.canViewQualityControl
        },
        { 
          name: "Processing", 
          icon: Coffee, 
          path: "/processing", 
          access: dataFilters.canViewProcessing
        },
        { 
          name: "Store Management", 
          icon: Shield, 
          path: "/store", 
          access: dataFilters.canViewInventory
        },
        { 
          name: "Inventory", 
          icon: Package, 
          path: "/inventory", 
          access: dataFilters.canViewInventory
        },
      ]
    },
    {
      title: "Management",
      items: [
        { 
          name: "Sales & Marketing", 
          icon: TrendingUp, 
          path: "/sales-marketing", 
          access: dataFilters.canViewAnalytics || employee.department === 'Sales'
        },
        { 
          name: "Finance", 
          icon: DollarSign, 
          path: "/finance", 
          access: dataFilters.canViewFinancialData
        },
        { 
          name: "Field Operations", 
          icon: MapPin, 
          path: "/field-operations", 
          access: dataFilters.canViewDashboard || employee.department === 'Field Operations'
        },
        { 
          name: "Human Resources", 
          icon: Users, 
          path: "/human-resources", 
          access: dataFilters.canViewEmployeeData
        },
        { 
          name: "Data Analyst", 
          icon: LineChart, 
          path: "/data-analyst", 
          access: dataFilters.canViewAnalytics
        },
      ]
    },
    {
      title: "System",
      items: [
        { 
          name: "Reports", 
          icon: FileText, 
          path: "/reports", 
          access: dataFilters.canViewReports
        },
        { 
          name: "Settings", 
          icon: Settings, 
          path: "/settings", 
          access: true // Everyone gets settings access
        },
        { 
          name: "Logistics", 
          icon: Truck, 
          path: "/logistics", 
          access: dataFilters.canViewDashboard || employee.department === 'Operations'
        },
      ]
    }
  ];

  // Filter navigation items based on access control
  const filteredNavigationItems = allNavigationItems.map(section => ({
    ...section,
    items: section.items.filter(item => item.access)
  })).filter(section => section.items.length > 0);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm font-medium text-green-800">{employee.name}</p>
          <p className="text-xs text-green-600">{employee.position}</p>
          <p className="text-xs text-green-600">{employee.department}</p>
          <p className="text-xs text-green-500 mt-1">Role: {employee.role}</p>
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
