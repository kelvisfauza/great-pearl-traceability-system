
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
  MapPin
} from "lucide-react";

const Navigation = () => {
  const location = useLocation();
  
  const navigationItems = [
    {
      title: "Operations",
      items: [
        { name: "Dashboard", icon: BarChart3, path: "/" },
        { name: "Procurement", icon: Package, path: "/procurement" },
        { name: "Quality Control", icon: ClipboardCheck, path: "/quality-control" },
        { name: "Processing", icon: Coffee, path: "/processing" },
        { name: "Inventory", icon: Shield, path: "/inventory" },
      ]
    },
    {
      title: "Management",
      items: [
        { name: "Sales & Marketing", icon: TrendingUp, path: "/sales-marketing" },
        { name: "Finance", icon: DollarSign, path: "/finance" },
        { name: "Field Operations", icon: MapPin, path: "/field-operations" },
        { name: "Human Resources", icon: Users, path: "/human-resources" },
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

  return (
    <Card>
      <CardContent className="p-4">
        <nav className="space-y-6">
          {navigationItems.map((section, sectionIndex) => (
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
                      className={`w-full justify-start ${
                        isActive 
                          ? "bg-green-600 hover:bg-green-700 text-white" 
                          : "text-gray-700 hover:bg-gray-100"
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

export default Navigation;
