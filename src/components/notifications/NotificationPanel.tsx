import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { 
  Bell, 
  X, 
  CheckCheck, 
  AlertTriangle, 
  Info, 
  Clock, 
  User, 
  DollarSign,
  Calendar,
  Building
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import AnnouncementDialog from "@/components/notifications/AnnouncementDialog";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPanel = ({ isOpen, onClose }: NotificationPanelProps) => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    loading 
  } = useNotifications();

  const getNotificationIcon = (type: string, priority: string) => {
    switch (type) {
      case 'approval_request':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'system':
        return priority === 'High' 
          ? <AlertTriangle className="h-4 w-4 text-red-500" />
          : <Info className="h-4 w-4 text-blue-500" />;
      case 'announcement':
        return <Bell className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  const formatAmount = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <SheetTitle>Notifications</SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <AnnouncementDialog trigger={<Button size="sm" variant="secondary">New announcement</Button>} />
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <SheetDescription>
            Stay updated with approvals, announcements, and system alerts
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No notifications</h3>
              <p className="text-muted-foreground">You're all caught up!</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <Card 
                    key={notification.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      !notification.isRead 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-background'
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getNotificationIcon(notification.type, notification.priority)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(notification.priority)}`}
                        >
                          {notification.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    {(notification.amount || notification.requestedBy || notification.department) && (
                      <CardContent className="pt-0 pb-3">
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          {notification.requestedBy && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{notification.requestedBy}</span>
                            </div>
                          )}
                          {notification.amount && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span className="font-medium text-foreground">
                                {formatAmount(notification.amount)}
                              </span>
                            </div>
                          )}
                          {notification.department && (
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              <span>{notification.department}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 ml-auto">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationPanel;