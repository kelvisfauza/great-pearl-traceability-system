import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, DollarSign, User, AlertCircle, Eye } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import NotificationDetailModal from "@/components/notifications/NotificationDetailModal";

interface NotificationWidgetProps {
  onViewAll: () => void;
}

const NotificationWidget = ({ onViewAll }: NotificationWidgetProps) => {
  const { notifications, unreadCount, markAsRead, deleteNotification } = useNotifications();
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Show only the most recent 3 notifications
  const recentNotifications = notifications.slice(0, 3);
  
  const handleNotificationClick = async (notification: any) => {
    setSelectedNotification(notification);
    setIsDetailModalOpen(true);
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  const formatAmount = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewAll}
          >
            <Eye className="h-4 w-4 mr-1" />
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recentNotifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No new notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                  !notification.isRead 
                    ? 'bg-primary/5 border-primary/20' 
                    : 'bg-background'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-2">
                  {notification.type === 'approval_request' ? (
                    <Clock className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  ) : notification.priority === 'High' ? (
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Bell className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{notification.title}</h4>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                      <div className="flex items-center gap-1 ml-auto">
                        <span>
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {notifications.length > 3 && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewAll}
                  className="text-xs"
                >
                  +{notifications.length - 3} more notifications
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedNotification(null);
        }}
        onMarkAsRead={markAsRead}
        onDelete={deleteNotification}
      />
    </Card>
  );
};

export default NotificationWidget;