
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const navigationItems = [
    {
      title: "Operations",
      items: [
        { name: "Dashboard", icon: BarChart3, active: true },
        { name: "Procurement", icon: Package },
        { name: "Quality Control", icon: ClipboardCheck },
        { name: "Processing", icon: Coffee },
        { name: "Inventory", icon: Shield },
      ]
    },
    {
      title: "Management",
      items: [
        { name: "Sales & Marketing", icon: TrendingUp },
        { name: "Finance", icon: DollarSign },
        { name: "Field Operations", icon: MapPin },
        { name: "Human Resources", icon: Users },
      ]
    },
    {
      title: "System",
      items: [
        { name: "Reports", icon: FileText },
        { name: "Settings", icon: Settings },
        { name: "Logistics", icon: Truck },
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
                {section.items.map((item, itemIndex) => (
                  <Button
                    key={itemIndex}
                    variant={item.active ? "default" : "ghost"}
                    className={`w-full justify-start ${
                      item.active 
                        ? "bg-green-600 hover:bg-green-700 text-white" 
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
};

export default Navigation;
