import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  Clock, 
  AlertTriangle, 
  Info, 
  User, 
  DollarSign,
  Calendar,
  Building,
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@/hooks/useNotifications";

interface NotificationDetailModalProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const NotificationDetailModal = ({ 
  notification, 
  isOpen, 
  onClose, 
  onMarkAsRead, 
  onDelete 
}: NotificationDetailModalProps) => {
  if (!notification) return null;

  const getNotificationIcon = (type: string, priority: string) => {
    switch (type) {
      case 'approval_request':
        return <Clock className="h-6 w-6 text-orange-500" />;
      case 'system':
        return priority === 'High' 
          ? <AlertTriangle className="h-6 w-6 text-red-500" />
          : <Info className="h-6 w-6 text-blue-500" />;
      case 'announcement':
        return <Bell className="h-6 w-6 text-green-500" />;
      default:
        return <Bell className="h-6 w-6 text-gray-500" />;
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

  const formatAmount = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const handleMarkAsRead = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(notification.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`p-3 rounded-full ${
                !notification.isRead ? 'bg-primary/10' : 'bg-muted'
              }`}>
                {getNotificationIcon(notification.type, notification.priority)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <DialogTitle className="text-xl font-semibold leading-tight">
                    {notification.title}
                  </DialogTitle>
                  {!notification.isRead && (
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse flex-shrink-0"></div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge 
                    variant="outline" 
                    className={`text-sm ${getPriorityColor(notification.priority)}`}
                  >
                    {notification.priority} Priority
                  </Badge>
                  <Badge variant="secondary" className="text-sm capitalize">
                    {notification.type.replace('_', ' ')}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="space-y-6">
          {/* Message Content */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Message</h3>
            <div className="bg-muted/30 rounded-lg p-4 border-l-4 border-primary">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {notification.message}
              </p>
            </div>
          </div>

          {/* Details Section */}
          {(notification.amount || notification.requestedBy || notification.senderName || notification.department) && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notification.senderName && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <User className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-purple-900">From</p>
                      <p className="text-sm text-purple-700">
                        {notification.senderName}
                        {notification.senderDepartment && (
                          <span className="text-purple-500 ml-1">
                            ({notification.senderDepartment})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                
                {notification.requestedBy && !notification.senderName && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <User className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Requested By</p>
                      <p className="text-sm text-blue-700">{notification.requestedBy}</p>
                    </div>
                  </div>
                )}

                {notification.amount && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Amount</p>
                      <p className="text-lg font-bold text-green-700">
                        {formatAmount(notification.amount)}
                      </p>
                    </div>
                  </div>
                )}

                {notification.department && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <Building className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Department</p>
                      <p className="text-sm text-blue-700">{notification.department}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Metadata */}
          {notification.metadata && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Additional Information</h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {JSON.stringify(notification.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {notification.isRead ? 'Read' : 'Unread'}
            </span>
            {notification.readAt && (
              <span className="text-xs text-muted-foreground">
                • Read {formatDistanceToNow(new Date(notification.readAt), { addSuffix: true })}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!notification.isRead && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAsRead}
              >
                Mark as Read
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              Delete
            </Button>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationDetailModal;