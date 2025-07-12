import { ReactNode, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RoleBasedNavigation from "./RoleBasedNavigation";
import PriceTicker from "./PriceTicker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, CircleUserRound, ChevronsUpDown } from "lucide-react";
import MessageButton from "./messaging/MessageButton";
import { usePresence } from "@/hooks/usePresence";

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const Layout = ({ children, title, subtitle }: LayoutProps) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const notifications = [
    {
      id: "1",
      title: "New message from John",
      description: "Check your inbox",
      time: "5 minutes ago",
    },
    {
      id: "2",
      title: "Report ready to download",
      description: "Sales report for Q3 is ready",
      time: "1 hour ago",
    },
  ];
  const { updatePresence } = usePresence();

  const handle BellClick = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  const handleUserMenuClick = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
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
                {/* Price Ticker */}
                <PriceTicker />
                
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
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {notifications.length > 9 ? "9+" : notifications.length}
                      </Badge>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0" align="end">
                    <Card className="shadow-none">
                      <CardHeader className="px-4 py-2">
                        <CardTitle>Notifications</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-80">
                          <div className="divide-y divide-border">
                            {notifications.map((notification) => (
                              <div
                                key={notification.id}
                                className="px-4 py-3 hover:bg-secondary cursor-pointer"
                              >
                                <div className="flex justify-between">
                                  <p className="text-sm font-medium">{notification.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {notification.time}
                                  </p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {notification.description}
                                </p>
                              </div>
                            ))}
                          </div>
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
                      User Menu
                      <ChevronsUpDown className="h-4 w-4 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="end">
                    <div className="p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Your Name</p>
                        <p className="text-xs text-muted-foreground">
                          your.email@example.com
                        </p>
                        <Separator />
                        <Button variant="ghost" className="w-full justify-start">
                          Profile
                        </Button>
                        <Button variant="ghost" className="w-full justify-start">
                          Settings
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
