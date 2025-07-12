
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Coffee, Bell, Search, LogOut } from "lucide-react";
import RoleBasedNavigation from "./RoleBasedNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

interface Notification {
  id: string;
  type: 'announcement' | 'price_update' | 'quality_assessment';
  title: string;
  message: string;
  timestamp: string;
  from: string;
}

const Layout = ({ children, title, subtitle }: LayoutProps) => {
  const { employee, signOut } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const notifications: Notification[] = [];

    try {
      // Get recent quality assessments with pricing
      const { data: qualityData } = await supabase
        .from('quality_assessments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (qualityData) {
        qualityData.forEach(assessment => {
          notifications.push({
            id: `quality-${assessment.id}`,
            type: 'quality_assessment',
            title: 'Quality Assessment Complete',
            message: `Batch ${assessment.batch_number} has been priced at UGX ${assessment.suggested_price?.toLocaleString()} by Quality team`,
            timestamp: assessment.created_at,
            from: assessment.assessed_by
          });
        });
      }

      // Get recent market data for price updates
      const { data: marketData } = await supabase
        .from('market_data')
        .select('*')
        .order('date_recorded', { ascending: false })
        .limit(3);

      if (marketData) {
        marketData.forEach(data => {
          notifications.push({
            id: `price-${data.id}`,
            type: 'price_update',
            title: 'Price Update',
            message: `Today's reference price: ${data.coffee_type} - UGX ${data.price_ugx?.toLocaleString()}/kg`,
            timestamp: data.created_at,
            from: 'Data Analyst'
          });
        });
      }

      // Add sample manager announcements (in a real app, these would come from a database)
      const managerAnnouncements = [
        {
          id: 'announce-1',
          type: 'announcement' as const,
          title: 'Daily Operations Update',
          message: 'All department heads please submit daily reports by 5 PM',
          timestamp: new Date().toISOString(),
          from: 'Operations Manager'
        },
        {
          id: 'announce-2',
          type: 'announcement' as const,
          title: 'Quality Standards Reminder',
          message: 'Moisture content must not exceed 12% for all batches',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          from: 'Quality Manager'
        }
      ];

      notifications.push(...managerAnnouncements);

      // Sort by timestamp (most recent first)
      notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setNotifications(notifications.slice(0, 10));
      setUnreadCount(notifications.length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return '📢';
      case 'price_update':
        return '💰';
      case 'quality_assessment':
        return '✅';
      default:
        return '🔔';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const clearNotifications = () => {
    setUnreadCount(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Coffee className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Great Pearl Coffee Factory</h1>
                <p className="text-sm text-gray-500">Management System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  placeholder="Search..." 
                  className="pl-10 w-64"
                />
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" onClick={clearNotifications}>
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 max-h-96 overflow-y-auto" align="end">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm mb-3">Recent Notifications</h3>
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-3 border-b border-gray-100 hover:bg-gray-50 rounded-md"
                        >
                          <div className="flex items-start space-x-3">
                            <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {notification.title}
                                </p>
                                <span className="text-xs text-gray-500">
                                  {formatTimestamp(notification.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                From: {notification.from}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No notifications available
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {employee && (
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                    <p className="text-xs text-gray-500">{employee.position}</p>
                  </div>
                  <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {employee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <RoleBasedNavigation />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {(title || subtitle) && (
              <div className="bg-gradient-to-r from-green-600 to-amber-600 rounded-lg p-6 text-white mb-8">
                <h2 className="text-2xl font-bold mb-2">{title}</h2>
                {subtitle && <p className="opacity-90">{subtitle}</p>}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
