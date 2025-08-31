
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
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';


const Navigation = () => {
  const location = useLocation();
  const { signOut, employee, hasPermission, hasRole, isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [lastKnownPermissions, setLastKnownPermissions] = useState<string[]>([]);

  // Auto-update permissions for keizyeda@gmail.com if needed
  useEffect(() => {
    const checkAndUpdatePermissions = async () => {
      if (employee && employee.email === 'keizyeda@gmail.com') {
        const currentPermissions = employee.permissions || [];
        
        if (!currentPermissions.includes('Store Management')) {
          console.log('Auto-updating Store Management permission for keizyeda@gmail.com');
          
          try {
            const newPermissions = [...currentPermissions, 'Store Management'];
            
            // Update in Firestore
            await updateDoc(doc(db, 'employees', employee.id), {
              permissions: newPermissions,
              updated_at: new Date().toISOString()
            });
            
            toast({
              title: "Permissions Updated",
              description: "Store Management access has been added automatically",
            });
            
            // Refresh the page to get updated permissions
            window.location.reload();
            
          } catch (error) {
            console.error('Error auto-updating permissions:', error);
          }
        }
      }
    };

    if (employee) {
      checkAndUpdatePermissions();
    }
  }, [employee, toast]);
  
  const navigationItems = [
    {
      title: "Operations", 
      items: [
        { name: "Dashboard", icon: BarChart3, path: "/", permission: "Reports" },
        { name: "Quality Control", icon: ClipboardCheck, path: "/quality-control", permission: "Quality Control" },
        { name: "Store Management", icon: Shield, path: "/store", permission: "Store Management" },
        { name: "Milling", icon: Coffee, path: "/milling", permission: "Milling" },
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
        { name: "IT Department", icon: Settings, path: "/it-department", permission: "IT Management" },
      ]
    },
    {
      title: "System",
      items: [
        { name: "Reports", icon: FileText, path: "/reports", permission: "Reports" },
        { name: "Settings", icon: Settings, path: "/settings", permission: "Reports" },
        { name: "Logistics", icon: Truck, path: "/logistics", permission: "Logistics" },
      ]
    }
  ];

  // Filter navigation items based on user permissions
  const getFilteredNavigationItems = () => {
    console.log('🔍 Navigation check - employee:', employee, 'user email:', employee?.email);
    
    // Don't show any items while employee data is still loading to prevent flickering
    if (!employee) {
      console.log('⚠️ No employee data, returning empty navigation');
      return [];
    }
    
    console.log('🔍 Filtering navigation for employee:', employee);
    console.log('🔍 Employee permissions:', employee.permissions);
    console.log('🔍 IsAdmin result:', isAdmin());
    
    // For Kibaba, ensure he has access to his specific items
    if (employee.email === 'nicholusscottlangz@gmail.com') {
      console.log('🎯 Processing navigation for Kibaba specifically');
      const kibabaSections = navigationItems.map(section => ({
        ...section,
        items: section.items.filter(item => {
          const hasAccess = !item.permission || 
                           isAdmin() || 
                           hasPermission(item.permission) ||
                           (item.permission === 'Quality Control' && employee.permissions?.includes('Quality Control')) ||
                           (item.permission === 'Store Management' && employee.permissions?.includes('Store Management')) ||
                           (item.permission === 'Reports' && employee.permissions?.includes('Reports')) ||
                           (item.permission === 'Milling' && employee.permissions?.includes('Milling')) ||
                           (item.permission === 'Inventory' && employee.permissions?.includes('Inventory'));
          
          console.log(`🔍 Item ${item.name} (${item.permission}): hasAccess=${hasAccess}`);
          return hasAccess;
        })
      })).filter(section => section.items.length > 0);
      
      console.log('🎯 Kibaba filtered sections:', kibabaSections);
      return kibabaSections;
    }
    
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

  // Debug logging for Denis specifically to track permission consistency
  if (employee?.email === 'bwambaledenis8@gmail.com') {
    console.log('=== DENIS NAVIGATION DEBUG ===');
    console.log('Denis Employee Data:', employee);
    console.log('Denis permissions array:', employee?.permissions);
    console.log('Has Reports permission:', hasPermission('Reports'));
    console.log('Has Store Management permission:', hasPermission('Store Management'));
    console.log('Has Data Analysis permission:', hasPermission('Data Analysis'));
    console.log('Is Admin:', isAdmin());
    console.log('Filtered navigation items for Denis:', filteredNavigationItems);
  }

  // Debug logging for Kibaba to track permission loading
  if (employee?.email === 'nicholusscottlangz@gmail.com') {
    console.log('=== KIBABA NAVIGATION DEBUG ===');
    console.log('Kibaba Employee Data:', employee);
    console.log('Kibaba permissions array:', employee?.permissions);
    console.log('Has Quality Control permission:', hasPermission('Quality Control'));
    console.log('Has Milling permission:', hasPermission('Milling'));
    console.log('Has Reports permission:', hasPermission('Reports'));
    console.log('Has Store Management permission:', hasPermission('Store Management'));
    console.log('Has Inventory permission:', hasPermission('Inventory'));
    console.log('Is Admin:', isAdmin());
    console.log('Filtered navigation items for Kibaba:', filteredNavigationItems);
  }

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-3 xs:p-4 border-b border-gray-200">
        <h2 className="font-semibold text-base xs:text-lg text-gray-800 truncate">Coffee ERP</h2>
      </div>
      
      <div className="flex-1 p-2 xs:p-3">
        <nav className="space-y-3 xs:space-y-4">
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
                      className={`w-full justify-start text-xs xs:text-sm h-8 xs:h-9 ${
                        isActive 
                          ? "bg-green-600 hover:bg-green-700 text-white shadow-sm" 
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                      asChild
                    >
                      <Link to={item.path}>
                        <item.icon className="h-3 w-3 xs:h-4 xs:w-4 mr-1 xs:mr-2 flex-shrink-0" />
                        <span className="truncate text-xs xs:text-sm">{item.name}</span>
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
      <div className="p-2 xs:p-3 border-t border-gray-200">
        {employee && (
          <div className="mb-2 xs:mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs xs:text-sm font-medium text-gray-800 truncate">{employee.name}</p>
              <p className="text-xs text-gray-500 truncate">{employee.position}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs xs:text-sm h-8 xs:h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-3 w-3 xs:h-4 xs:w-4 mr-1 xs:mr-2 flex-shrink-0" />
          <span className="truncate">Sign Out</span>
        </Button>
      </div>
    </div>
  );
};

export default Navigation;
