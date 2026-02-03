
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
  LogOut,
  Receipt,
  UserCheck,
  ArrowRight,
  FileCheck
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
        { name: "Dashboard", icon: BarChart3, path: "/", permission: "Dashboard" },
        { name: "Quality Control", icon: ClipboardCheck, path: "/quality-control", permission: "Quality Control" },
        { name: "Store Management", icon: Shield, path: "/store", permission: "Store Management" },
        { name: "EUDR Documentation", icon: FileText, path: "/eudr-documentation", permission: "EUDR Documentation" },
        { name: "Milling", icon: Coffee, path: "/milling", permission: "Milling" },
        { name: "Inventory", icon: Package, path: "/inventory", permission: "Inventory" },
        { name: "Field Operations", icon: MapPin, path: "/field-operations", permission: "Field Operations" },
      ]
    },
    {
      title: "Management",
      items: [
        { name: "Suppliers", icon: UserCheck, path: "/suppliers", permission: null },
        { name: "Sales & Marketing", icon: TrendingUp, path: "/sales-marketing", permission: "Sales Marketing" },
        { name: "My Expenses", icon: DollarSign, path: "/my-expenses", permission: null },
        { name: "Human Resources", icon: Users, path: "/human-resources", permission: "Human Resources" },
        { name: "Data Analyst", icon: LineChart, path: "/data-analyst", permission: "Data Analysis" },
        { name: "IT Department", icon: Settings, path: "/it-department", permission: "IT Management" },
      ]
    },
    {
      title: "System",
      items: [
        { name: "My Daily Reports", icon: FileCheck, path: "/user-daily-reports", permission: null },
        { name: "Reports", icon: FileText, path: "/reports", permission: "Reports" },
        { name: "Settings", icon: Settings, path: "/settings", permission: "Reports" },
        { name: "Logistics", icon: Truck, path: "/logistics", permission: "Logistics" },
      ]
    }
  ];

  // Filter navigation items based on user permissions
  const getFilteredNavigationItems = () => {
    console.log('🔍 Navigation check - employee:', employee, 'user email:', employee?.email);
    
    // Show basic navigation even if employee data isn't fully loaded yet
    if (!employee) {
      console.log('⚠️ No employee data, showing basic navigation');
      // Show basic items for authenticated users
      return [
        {
          title: "Operations",
          items: [
            { name: "Dashboard", icon: BarChart3, path: "/", permission: null },
          ]
        }
      ];
    }
    
    console.log('🔍 Filtering navigation for employee:', employee);
    console.log('🔍 Employee permissions:', employee.permissions);
    
    return navigationItems.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // If no permission required, show to everyone
        if (!item.permission) return true;
        
        // If user is admin, show everything
        if (isAdmin()) return true;
        
        // Check if user has the specific permission (includes granular like :view)
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

  // Debug logging for Timothy to track Finance permissions
  if (employee?.email === 'tatwanzire@gmail.com') {
    console.log('=== TIMOTHY NAVIGATION DEBUG ===');
    console.log('Timothy Employee Data:', employee);
    console.log('Timothy permissions array:', employee?.permissions);
    console.log('Has Finance permission:', hasPermission('Finance'));
    console.log('Has Human Resources permission:', hasPermission('Human Resources'));
    console.log('Has Reports permission:', hasPermission('Reports'));
    console.log('Is Admin:', isAdmin());
    console.log('Filtered navigation items for Timothy:', filteredNavigationItems);
  }

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Check if Christmas period
  const isChristmasPeriod = new Date() < new Date('2026-01-01');

  return (
    <div className={`h-full w-full flex flex-col relative ${isChristmasPeriod ? 'christmas-frame' : ''}`}>
      {/* Christmas lights decoration */}
      {isChristmasPeriod && (
        <>
          {/* Top lights */}
          <div className="absolute top-0 left-0 right-0 h-6 flex justify-around items-center pointer-events-none z-10">
            {[...Array(8)].map((_, i) => (
              <div
                key={`top-${i}`}
                className="w-3 h-3 rounded-full animate-pulse"
                style={{
                  backgroundColor: ['#ff0000', '#00ff00', '#ffff00', '#ff6600', '#ff00ff', '#00ffff', '#ff0000', '#00ff00'][i],
                  boxShadow: `0 0 10px 3px ${['#ff0000', '#00ff00', '#ffff00', '#ff6600', '#ff00ff', '#00ffff', '#ff0000', '#00ff00'][i]}`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1.5s'
                }}
              />
            ))}
          </div>
          {/* Left lights */}
          <div className="absolute top-6 left-1 bottom-0 w-4 flex flex-col justify-around items-center pointer-events-none z-10">
            {[...Array(10)].map((_, i) => (
              <div
                key={`left-${i}`}
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{
                  backgroundColor: ['#ff0000', '#00ff00', '#ffff00', '#ff6600', '#ff00ff'][i % 5],
                  boxShadow: `0 0 8px 2px ${['#ff0000', '#00ff00', '#ffff00', '#ff6600', '#ff00ff'][i % 5]}`,
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '1.2s'
                }}
              />
            ))}
          </div>
          {/* Right lights */}
          <div className="absolute top-6 right-1 bottom-0 w-4 flex flex-col justify-around items-center pointer-events-none z-10">
            {[...Array(10)].map((_, i) => (
              <div
                key={`right-${i}`}
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{
                  backgroundColor: ['#00ff00', '#ff0000', '#ff00ff', '#ffff00', '#00ffff'][i % 5],
                  boxShadow: `0 0 8px 2px ${['#00ff00', '#ff0000', '#ff00ff', '#ffff00', '#00ffff'][i % 5]}`,
                  animationDelay: `${i * 0.18}s`,
                  animationDuration: '1.3s'
                }}
              />
            ))}
          </div>
          {/* Corner decorations */}
          <div className="absolute top-1 left-1 text-xl pointer-events-none z-10">🎄</div>
          <div className="absolute top-1 right-1 text-xl pointer-events-none z-10">⭐</div>
        </>
      )}
      
      <div className={`p-3 xs:p-4 border-b border-gray-200 ${isChristmasPeriod ? 'pt-8' : ''}`}>
        <div className="flex items-center gap-2">
          <img 
            src="/lovable-uploads/great-pearl-coffee-logo.png" 
            alt="Great Pearl Coffee" 
            className="w-8 h-8 rounded-lg object-contain"
          />
          <h2 className="font-semibold text-base xs:text-lg text-gray-800 truncate flex items-center gap-2">
            {isChristmasPeriod && <span>🎅</span>}
            Great Pearl Coffee
            {isChristmasPeriod && <span>🎁</span>}
          </h2>
        </div>
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
          className="w-full justify-start text-xs xs:text-sm h-8 xs:h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 mb-1"
          asChild
        >
          <Link to="/v2">
            <ArrowRight className="h-3 w-3 xs:h-4 xs:w-4 mr-1 xs:mr-2 flex-shrink-0" />
            <span className="truncate">Switch to V2</span>
          </Link>
        </Button>
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
