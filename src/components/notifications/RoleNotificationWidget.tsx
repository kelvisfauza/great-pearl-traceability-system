import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface RoleNotification {
  id: string;
  type: 'role_change' | 'permission_change' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export const RoleNotificationWidget = () => {
  const [notifications, setNotifications] = useState<RoleNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { employee } = useAuth();

  // Monitor for role/permission changes
  useEffect(() => {
    if (!employee) return;

    const checkForChanges = () => {
      const storedData = localStorage.getItem('lastKnownEmployee');
      const lastKnownEmployee = storedData ? JSON.parse(storedData) : null;

      if (lastKnownEmployee && lastKnownEmployee.email === employee.email) {
        const roleChanged = lastKnownEmployee.role !== employee.role;
        const permissionsChanged = JSON.stringify(lastKnownEmployee.permissions?.sort()) !== 
                                  JSON.stringify(employee.permissions?.sort());

        if (roleChanged || permissionsChanged) {
          const newNotifications: RoleNotification[] = [];

          if (roleChanged) {
            newNotifications.push({
              id: `role-${Date.now()}`,
              type: 'role_change',
              title: 'Role Updated',
              message: `Your role has been changed from "${lastKnownEmployee.role}" to "${employee.role}"`,
              timestamp: new Date(),
              read: false
            });
          }

          if (permissionsChanged) {
            const oldPerms = lastKnownEmployee.permissions || [];
            const newPerms = employee.permissions || [];
            const addedPerms = newPerms.filter((p: string) => !oldPerms.includes(p));
            const removedPerms = oldPerms.filter((p: string) => !newPerms.includes(p));

            if (addedPerms.length > 0) {
              newNotifications.push({
                id: `perm-add-${Date.now()}`,
                type: 'permission_change',
                title: 'New Permissions Added',
                message: `You now have access to: ${addedPerms.join(', ')}`,
                timestamp: new Date(),
                read: false
              });
            }

            if (removedPerms.length > 0) {
              newNotifications.push({
                id: `perm-remove-${Date.now()}`,
                type: 'permission_change',
                title: 'Permissions Removed',
                message: `You no longer have access to: ${removedPerms.join(', ')}`,
                timestamp: new Date(),
                read: false
              });
            }
          }

          if (newNotifications.length > 0) {
            setNotifications(prev => [...newNotifications, ...prev].slice(0, 10)); // Keep only last 10
            setIsOpen(true); // Auto-open when new notifications arrive
          }
        }
      }

      // Always update stored data
      localStorage.setItem('lastKnownEmployee', JSON.stringify(employee));
    };

    checkForChanges();
  }, [employee?.role, employee?.permissions]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'role_change':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'permission_change':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto z-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Role & Permission Updates</h3>
              <div className="flex gap-1">
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
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    notification.read 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      {getIcon(notification.type)}
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {notification.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(notification.id);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};