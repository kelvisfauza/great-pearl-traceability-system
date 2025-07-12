
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Coffee, Bell, Search, LogOut } from "lucide-react";
import RoleBasedNavigation from "./RoleBasedNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

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
  isRead?: boolean;
}

const Layout = ({ children, title, subtitle }: LayoutProps) => {
  const { employee, signOut } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadNotifications();
    // Load read notifications from localStorage
    const saved = localStorage.getItem('readNotifications');
    if (saved) {
      setReadNotifications(new Set(JSON.parse(saved)));
    }
  }, []);

  const loadNotifications = async () => {
    const notifications: Notification[] = [];

    try {
      // Get recent quality assessments with pricing
      const { data: qualityData } = await supabase
        .from('quality_assessments')
        .select(`
          *,
          coffee_records!inner(supplier_name, coffee_type, kilograms)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (qualityData) {
        qualityData.forEach(assessment => {
          const record = assessment.coffee_records;
          notifications.push({
            id: `quality-${assessment.id}`,
            type: 'quality_assessment',
            title: 'Quality Assessment Complete',
            message: `${record.supplier_name}'s ${record.coffee_type} batch ${assessment.batch_number} (${record.kilograms}kg) has been priced at UGX ${assessment.suggested_price?.toLocaleString()}/kg by ${assessment.assessed_by}`,
            timestamp: assessment.created_at,
            from: assessment.assessed_by || 'Quality Team'
          });
        });
      }

      // Get recent market data for price updates
      const { data: marketData } = await supabase
        .from('market_data')
        .select('*')
        .order('date_recorded', { ascending: false })
        .limit(5);

      if (marketData) {
        marketData.forEach(data => {
          notifications.push({
            id: `price-${data.id}`,
            type: 'price_update',
            title: 'Market Price Update',
            message: `Today's reference price: ${data.coffee_type} - UGX ${data.price_ugx?.toLocaleString()}/kg (Source: ${data.market_source})`,
            timestamp: data.created_at,
            from: 'Data Analyst'
          });
        });
      }

      // Add manager announcements based on recent activities
      const { data: recentRecords } = await supabase
        .from('coffee_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentRecords && recentRecords.length > 0) {
        const managerAnnouncements = [
          {
            id: 'announce-daily-ops',
            type: 'announcement' as const,
            title: 'Daily Operations Update',
            message: `${recentRecords.length} new coffee batches received today. All department heads please ensure quality assessments are completed by 5 PM`,
            timestamp: new Date().toISOString(),
            from: 'Operations Manager'
          },
          {
            id: 'announce-quality-standards',
            type: 'announcement' as const,
            title: 'Quality Standards Reminder',
            message: 'Moisture content must not exceed 12% for all batches. Any batch exceeding this limit should be flagged for drying',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            from: 'Quality Manager'
          }
        ];
        notifications.push(...managerAnnouncements);
      }

      // Sort by timestamp (most recent first)
      notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setNotifications(notifications.slice(0, 15));
      
      // Update unread count
      const unreadNotifications = notifications.filter(n => !readNotifications.has(n.id));
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
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

  const markAllAsRead = () => {
    const allNotificationIds = notifications.map(n => n.id);
    const newReadNotifications = new Set([...readNotifications, ...allNotificationIds]);
    setReadNotifications(newReadNotifications);
    setUnreadCount(0);
    
    // Save to localStorage
    localStorage.setItem('readNotifications', JSON.stringify([...newReadNotifications]));
    
    toast({
      title: "Notifications cleared",
      description: "All notifications have been marked as read",
    });
  };

  const markAsRead = (notificationId: string) => {
    const newReadNotifications = new Set([...readNotifications, notificationId]);
    setReadNotifications(newReadNotifications);
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // Save to localStorage
    localStorage.setItem('readNotifications', JSON.stringify([...newReadNotifications]));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    setReadNotifications(new Set());
    localStorage.removeItem('readNotifications');
    
    toast({
      title: "Notifications cleared",
      description: "All notifications have been removed",
    });
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
                  <Button variant="outline" size="sm">
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
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Notifications</h3>
                      <div className="flex gap-2">
                        {unreadCount > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={markAllAsRead}
                            className="text-xs"
                          >
                            Mark all read
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearAllNotifications}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Clear all
                        </Button>
                      </div>
                    </div>
                    {notifications.length > 0 ? (
                      notifications.map((notification) => {
                        const isRead = readNotifications.has(notification.id);
                        return (
                          <div
                            key={notification.id}
                            className={`p-3 border-b border-gray-100 hover:bg-gray-50 rounded-md cursor-pointer ${
                              !isRead ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => !isRead && markAsRead(notification.id)}
                          >
                            <div className="flex items-start space-x-3">
                              <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm font-medium text-gray-900 truncate ${
                                    !isRead ? 'font-semibold' : ''
                                  }`}>
                                    {notification.title}
                                  </p>
                                  <span className="text-xs text-gray-500">
                                    {formatTimestamp(notification.timestamp)}
                                  </span>
                                </div>
                                <p className={`text-sm text-gray-600 mt-1 ${
                                  !isRead ? 'font-medium' : ''
                                }`}>
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  From: {notification.from}
                                </p>
                                {!isRead && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
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
