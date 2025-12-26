import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { 
  Package, 
  FlaskConical, 
  Warehouse, 
  ShoppingCart,
  ArrowLeft,
  Wallet,
  Users,
  MapPin,
  BarChart3,
  Leaf,
  Truck,
  Factory,
  Cog,
  ShoppingBag,
  Monitor,
  Shield,
  Home
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Department to navigation mapping
const DEPARTMENT_NAV_CONFIG: Record<string, { 
  section: string; 
  items: { icon: any; label: string; path: string; permission?: string }[] 
}[]> = {
  'Store': [
    {
      section: "Store Operations",
      items: [
        { icon: Package, label: "Coffee Receipts", path: "/v2/store", permission: "Store Management" },
        { icon: Warehouse, label: "Inventory", path: "/v2/inventory", permission: "Store Management" },
        { icon: Leaf, label: "EUDR", path: "/v2/eudr", permission: "Store Management" },
      ]
    }
  ],
  'Quality Control': [
    {
      section: "Quality Operations",
      items: [
        { icon: FlaskConical, label: "Quality Check", path: "/v2/quality", permission: "Quality Control" },
        { icon: Package, label: "Pending Lots", path: "/v2/quality", permission: "Quality Control" },
      ]
    }
  ],
  'Quality': [
    {
      section: "Quality Operations",
      items: [
        { icon: FlaskConical, label: "Quality Check", path: "/v2/quality", permission: "Quality Control" },
      ]
    }
  ],
  'Sales': [
    {
      section: "Sales Operations",
      items: [
        { icon: ShoppingCart, label: "Sales", path: "/v2/sales", permission: "Sales Marketing" },
        { icon: Warehouse, label: "Inventory", path: "/v2/inventory", permission: "Store Management" },
      ]
    }
  ],
  'Sales & Marketing': [
    {
      section: "Sales Operations",
      items: [
        { icon: ShoppingCart, label: "Sales", path: "/v2/sales", permission: "Sales Marketing" },
      ]
    }
  ],
  'Finance': [
    {
      section: "Finance Operations",
      items: [
        { icon: Wallet, label: "Payments", path: "/v2/finance", permission: "Finance" },
      ]
    }
  ],
  'Human Resources': [
    {
      section: "HR Operations",
      items: [
        { icon: Users, label: "HR Dashboard", path: "/v2/hr", permission: "Human Resources" },
      ]
    }
  ],
  'Field Operations': [
    {
      section: "Field Operations",
      items: [
        { icon: MapPin, label: "Field Ops", path: "/v2/field-operations", permission: "Field Operations" },
      ]
    }
  ],
  'Data Analysis': [
    {
      section: "Analytics",
      items: [
        { icon: BarChart3, label: "Analytics", path: "/v2/analytics", permission: "Data Analysis" },
      ]
    }
  ],
  'EUDR Documentation': [
    {
      section: "EUDR",
      items: [
        { icon: Leaf, label: "EUDR", path: "/v2/eudr", permission: "EUDR Documentation" },
      ]
    }
  ],
  'Logistics': [
    {
      section: "Logistics",
      items: [
        { icon: Truck, label: "Logistics", path: "/v2/logistics", permission: "Logistics" },
      ]
    }
  ],
  'Processing': [
    {
      section: "Processing",
      items: [
        { icon: Factory, label: "Processing", path: "/v2/processing", permission: "Processing" },
      ]
    }
  ],
  'Milling': [
    {
      section: "Milling",
      items: [
        { icon: Cog, label: "Milling", path: "/v2/milling", permission: "Milling" },
      ]
    }
  ],
  'Procurement': [
    {
      section: "Procurement",
      items: [
        { icon: ShoppingBag, label: "Procurement", path: "/v2/procurement", permission: "Procurement" },
      ]
    }
  ],
  'IT': [
    {
      section: "IT",
      items: [
        { icon: Monitor, label: "IT Dashboard", path: "/v2/it", permission: "IT Management" },
      ]
    }
  ],
  'IT Department': [
    {
      section: "IT",
      items: [
        { icon: Monitor, label: "IT Dashboard", path: "/v2/it", permission: "IT Management" },
      ]
    }
  ],
  'Administration': [
    {
      section: "All Departments",
      items: [
        { icon: Shield, label: "Admin", path: "/v2/admin" },
        { icon: Package, label: "Store", path: "/v2/store" },
        { icon: FlaskConical, label: "Quality", path: "/v2/quality" },
        { icon: Warehouse, label: "Inventory", path: "/v2/inventory" },
        { icon: ShoppingCart, label: "Sales", path: "/v2/sales" },
        { icon: Wallet, label: "Finance", path: "/v2/finance" },
        { icon: Users, label: "HR", path: "/v2/hr" },
      ]
    }
  ],
};

// Admin gets all departments
const ADMIN_NAV = [
  {
    section: "All Departments",
    items: [
      { icon: Shield, label: "Admin", path: "/v2/admin" },
      { icon: Package, label: "Store", path: "/v2/store" },
      { icon: FlaskConical, label: "Quality", path: "/v2/quality" },
      { icon: Warehouse, label: "Inventory", path: "/v2/inventory" },
      { icon: ShoppingCart, label: "Sales", path: "/v2/sales" },
      { icon: Wallet, label: "Finance", path: "/v2/finance" },
      { icon: Users, label: "HR", path: "/v2/hr" },
      { icon: MapPin, label: "Field Ops", path: "/v2/field-operations" },
      { icon: BarChart3, label: "Analytics", path: "/v2/analytics" },
      { icon: Leaf, label: "EUDR", path: "/v2/eudr" },
    ]
  }
];

const V2Navigation = () => {
  const location = useLocation();
  const { employee, isAdmin } = useAuth();

  // Get navigation items based on department or admin status
  const getNavItems = () => {
    if (isAdmin()) {
      return ADMIN_NAV;
    }
    
    const department = employee?.department || '';
    return DEPARTMENT_NAV_CONFIG[department] || [];
  };

  const navItems = getNavItems();

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (isAdmin()) return true;
    return employee?.permissions?.includes(permission);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {employee?.department || 'V2'} Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Back to V1 */}
        <Button
          variant="outline"
          className="w-full justify-start"
          asChild
        >
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to V1
          </Link>
        </Button>

        {/* My Dashboard */}
        <Button
          variant="ghost"
          className="w-full justify-start"
          asChild
        >
          <Link to="/v2">
            <Home className="mr-2 h-4 w-4" />
            My Dashboard
          </Link>
        </Button>

        {/* Navigation Items */}
        {navItems.map((section) => (
          <div key={section.section} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground px-2">
              {section.section}
            </h3>
            <nav className="flex flex-col gap-1">
              {section.items.map((item) => {
                if (!hasPermission(item.permission)) return null;
                
                const Icon = item.icon;
                const isActive = location.pathname === item.path || 
                  (item.path !== '/v2' && location.pathname.startsWith(item.path));
                
                return (
                  <Button
                    key={item.path + item.label}
                    variant={isActive ? "default" : "ghost"}
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to={item.path}>
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </nav>
          </div>
        ))}

        {/* User Info */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground px-2">
            Logged in as:
          </p>
          <p className="text-sm font-medium px-2">{employee?.name}</p>
          <p className="text-xs text-muted-foreground px-2">{employee?.role}</p>
          <p className="text-xs text-muted-foreground px-2">{employee?.department}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default V2Navigation;
