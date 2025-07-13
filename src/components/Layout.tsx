
import { ReactNode, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RoleBasedNavigation from "./RoleBasedNavigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, CircleUserRound, ChevronsUpDown, X, LogOut } from "lucide-react";
import MessageButton from "./messaging/MessageButton";
import { usePresence } from "@/hooks/usePresence";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const Layout = ({ children, title, subtitle }: LayoutProps) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { updatePresence } = usePresence();
  const { user, employee, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications from database
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // For now, we'll fetch from approval_requests as notifications
      // You can create a dedicated notifications table later
      const { data, error } = await supabase
        .from("approval_requests")
        .select("*")
        .eq("status", "Pending")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      return data?.map(request => ({
        id: request.id,
        title: request.title,
        description: `${request.type} - ${request.department}`,
        time: new Date(request.created_at).toLocaleString(),
        type: "approval_request"
      })) || [];
    },
    enabled: !!user,
  });

  // Clear notification mutation
  const clearNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      // For approval requests, we'll mark them as "Reviewed" instead of deleting
      const { error } = await supabase
        .from("approval_requests")
        .update({ status: "Reviewed" })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "Notification cleared",
        description: "The notification has been cleared successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to clear notification. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBellClick = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  const handleUserMenuClick = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleClearNotification = (notificationId: string) => {
    clearNotification.mutate(notificationId);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-white border-r border-gray-200 p-4">
          <RoleBasedNavigation />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                {/* Messages Button */}
                <MessageButton />
                
                {/* Notifications */}
                <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBellClick}
                      className="relative"
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Notifications
                      {notifications.length > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                        >
                          {notifications.length > 9 ? "9+" : notifications.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0" align="end">
                    <Card className="shadow-none">
                      <CardHeader className="px-4 py-2">
                        <CardTitle>Notifications</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-80">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500">
                              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No notifications</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-border">
                              {notifications.map((notification) => (
                                <div
                                  key={notification.id}
                                  className="px-4 py-3 hover:bg-secondary cursor-pointer group"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start mb-1">
                                        <p className="text-sm font-medium truncate">{notification.title}</p>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleClearNotification(notification.id);
                                          }}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <p className="text-sm text-muted-foreground truncate">
                                        {notification.description}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {notification.time}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </PopoverContent>
                </Popover>

                {/* User Menu */}
                <Popover open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUserMenuClick}
                    >
                      <CircleUserRound className="h-4 w-4 mr-2" />
                      {employee ? employee.name : user?.email || 'User'}
                      <ChevronsUpDown className="h-4 w-4 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="end">
                    <div className="p-4">
                      <div className="space-y-2">
                        {employee ? (
                          <>
                            <p className="text-sm font-medium">{employee.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {employee.position} • {employee.department}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {employee.email}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium">User</p>
                            <p className="text-xs text-muted-foreground">
                              {user?.email}
                            </p>
                          </>
                        )}
                        <Separator />
                        <Button variant="ghost" className="w-full justify-start" asChild>
                          <Link to="/settings">
                            Settings
                          </Link>
                        </Button>
                        <Separator />
                        
                        {/* Presence Status */}
                        <div className="pt-2 border-t">
                          <p className="text-xs text-gray-500 mb-2">Status</p>
                          <div className="grid grid-cols-2 gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updatePresence.mutate("online")}
                              className="text-xs justify-start"
                            >
                              🟢 Online
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updatePresence.mutate("away")}
                              className="text-xs justify-start"
                            >
                              🟡 Away
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updatePresence.mutate("busy")}
                              className="text-xs justify-start"
                            >
                              🔴 Busy
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updatePresence.mutate("offline")}
                              className="text-xs justify-start"
                            >
                              ⚫ Offline
                            </Button>
                          </div>
                        </div>
                        
                        <Separator />
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={handleSignOut}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
