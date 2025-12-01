import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { 
  Package, 
  FlaskConical, 
  Wallet, 
  Warehouse, 
  ShoppingCart,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const V2Navigation = () => {
  const location = useLocation();
  const { employee } = useAuth();

  const navItems = [
    {
      section: "Workflow",
      items: [
        { icon: Package, label: "Store", path: "/v2/store", permission: "Store Management" },
        { icon: FlaskConical, label: "Quality", path: "/v2/quality", permission: "Quality Control" },
        { icon: Wallet, label: "Finance", path: "/v2/finance", permission: "Finance" },
        { icon: Warehouse, label: "Inventory", path: "/v2/inventory", permission: "Store Management" },
        { icon: ShoppingCart, label: "Sales", path: "/v2/sales", permission: "Sales Marketing" },
      ]
    }
  ];

  const hasPermission = (permission: string) => {
    if (employee?.role === 'Administrator' || employee?.role === 'Super Admin') {
      return true;
    }
    return employee?.permissions?.includes(permission);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          V2 System Navigation
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
                const isActive = location.pathname.startsWith(item.path);
                
                return (
                  <Button
                    key={item.path}
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
        </div>
      </CardContent>
    </Card>
  );
};

export default V2Navigation;
