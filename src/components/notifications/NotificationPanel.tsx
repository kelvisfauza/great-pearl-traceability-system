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
  Building,
  Trash2
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
    clearAllNotifications,
    deleteNotification,
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

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const formatAmount = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] bg-gradient-to-br from-background to-muted/20">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="h-6 w-6 text-primary" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <div>
                <SheetTitle className="text-xl font-semibold">Notifications</SheetTitle>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="mt-1 animate-fade-in">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-muted">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <AnnouncementDialog trigger={
              <Button size="sm" variant="secondary" className="hover-scale">
                <Bell className="h-4 w-4 mr-2" />
                New announcement
              </Button>
            } />
            {notifications.length > 0 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={clearAllNotifications}
                className="text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                <X className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          
          <SheetDescription className="text-muted-foreground">
            Stay updated with approvals, announcements, and system alerts
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary animate-pulse" />
                </div>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 animate-fade-in">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full mx-auto flex items-center justify-center">
                  <Bell className="h-8 w-8 text-primary/60" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCheck className="h-3 w-3 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">You're all caught up!</h3>
              <p className="text-muted-foreground">No new notifications at the moment</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3 pr-2">
                {notifications.map((notification, index) => (
                  <Card 
                    key={notification.id}
                    className={`group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-l-4 animate-fade-in ${
                      !notification.isRead 
                        ? 'bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-primary shadow-sm border-l-primary' 
                        : 'bg-background border-l-gray-200 hover:border-l-primary/50'
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-full transition-colors ${
                            !notification.isRead ? 'bg-primary/10' : 'bg-muted'
                          }`}>
                            {getNotificationIcon(notification.type, notification.priority)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-medium text-sm leading-tight ${
                                !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                              }`}>
                                {notification.title}
                              </h4>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse flex-shrink-0"></div>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs flex-shrink-0 transition-colors ${getPriorityColor(notification.priority)}`}
                          >
                            {notification.priority}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteNotification(e, notification.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto w-auto hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {(notification.amount || notification.requestedBy || notification.department) && (
                      <CardContent className="pt-0 pb-3">
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {notification.requestedBy && (
                            <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                              <User className="h-3 w-3" />
                              <span>{notification.requestedBy}</span>
                            </div>
                          )}
                          {notification.amount && (
                            <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-md">
                              <DollarSign className="h-3 w-3" />
                              <span className="font-medium">
                                {formatAmount(notification.amount)}
                              </span>
                            </div>
                          )}
                          {notification.department && (
                            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                              <Building className="h-3 w-3" />
                              <span>{notification.department}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 ml-auto text-xs text-muted-foreground">
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